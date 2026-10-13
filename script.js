
/* ==========================================
   ESTAÇÃO ALEGRIA — SCRIPT.JS
   Login com somente senha na tela
   ========================================== */

// 1. COLOQUE OS DADOS DO SEU SUPABASE
const SUPABASE_URL = "COLE_A_URL_DO_SEU_PROJETO";
const SUPABASE_PUBLIC_KEY = "COLE_SUA_CHAVE_PUBLICA";

// Nome do armazenamento criado no Supabase
const BUCKET = "estacao-media";

// Senha inicial do painel
// ATENÇÃO: esta senha no navegador não é segura
// para proteger operações administrativas reais.
const SENHA_ADMIN = "080626";

const configurado =
  SUPABASE_URL.startsWith("https://") &&
  !SUPABASE_URL.includes("COLE_A_URL") &&
  !SUPABASE_PUBLIC_KEY.includes("COLE_SUA_CHAVE");

const db = configurado && window.supabase
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY)
  : null;

const $ = (id) => document.getElementById(id);
let adminLiberado = false;

const categorias = {
  aviso: "📣 Aviso",
  evento: "🎉 Evento",
  promocao: "🏷️ Promoção",
  foto: "📸 Foto",
  video: "🎬 Vídeo"
};

/* ==========================================
   FUNÇÕES GERAIS
   ========================================== */

function mensagem(id, texto, erro = false) {
  const elemento = $(id);
  if (!elemento) return;

  elemento.textContent = texto;
  elemento.style.color = erro ? "#b42318" : "#2363ad";
}

function criarElemento(tag, classe, texto) {
  const elemento = document.createElement(tag);

  if (classe) elemento.className = classe;
  if (texto !== undefined) elemento.textContent = texto;

  return elemento;
}

function mostrarInicio() {
  $("site-publico").classList.remove("escondido");
  $("tela-login").classList.add("escondido");
  $("painel-admin").classList.add("escondido");

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function mostrarLogin() {
  $("site-publico").classList.add("escondido");
  $("painel-admin").classList.add("escondido");
  $("tela-login").classList.remove("escondido");

  $("senha-admin").value = "";
  mensagem("mensagem-login", "");

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function mostrarPainel() {
  $("site-publico").classList.add("escondido");
  $("tela-login").classList.add("escondido");
  $("painel-admin").classList.remove("escondido");

  carregarAdmin();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function verificarConfiguracao() {
  if (!db) {
    alert(
      "Configure a URL e a chave pública do Supabase no início do script.js."
    );
    return false;
  }

  return true;
}

/* ==========================================
   LOGIN — SOMENTE SENHA
   ========================================== */

$("abrir-admin").addEventListener("click", mostrarLogin);
$("atalho-admin").addEventListener("click", mostrarLogin);

$("form-login").addEventListener("submit", (evento) => {
  evento.preventDefault();

  const senha = $("senha-admin").value;

  if (senha !== SENHA_ADMIN) {
    mensagem("mensagem-login", "Senha incorreta.", true);
    return;
  }

  adminLiberado = true;
  $("senha-admin").value = "";
  mensagem("mensagem-login", "");

  mostrarPainel();
});

$("sair-admin").addEventListener("click", () => {
  adminLiberado = false;
  mostrarInicio();
});

/* ==========================================
   CARREGAR PUBLICAÇÕES PÚBLICAS
   ========================================== */

async function buscarPublicacoes() {
  if (!verificarConfiguracao()) return [];

  const { data, error } = await db
    .from("publicacoes")
    .select("*")
    .order("criado_em", { ascending: false });

  if (error) {
    console.error("Erro ao carregar publicações:", error);
    mostrarErroPublico(
      "Não foi possível carregar as publicações. Verifique a configuração do Supabase."
    );
    return [];
  }

  return data || [];
}

function mostrarErroPublico(texto) {
  ["lista-novidades", "lista-galeria"].forEach((id) => {
    const area = $(id);
    if (!area) return;

    area.replaceChildren();
    area.appendChild(criarElemento("p", "estado", texto));
  });
}

function criarCartao(publicacao) {
  const cartao = criarElemento("article", "cartao");
  const categoria = publicacao.categoria;
  const url = publicacao.arquivo_url;

  if (url && categoria === "foto") {
    const imagem = document.createElement("img");
    imagem.src = url;
    imagem.alt = publicacao.titulo || "Foto da Estação Alegria";
    imagem.loading = "lazy";
    cartao.appendChild(imagem);
  }

  if (url && categoria === "video") {
    const video = document.createElement("video");
    video.src = url;
    video.controls = true;
    video.preload = "metadata";
    video.playsInline = true;
    cartao.appendChild(video);
  }

  const corpo = criarElemento("div", "cartao-corpo");

  corpo.appendChild(
    criarElemento("span", "tag", categorias[categoria] || "✨ Novidade")
  );

  corpo.appendChild(
    criarElemento("h3", "", publicacao.titulo)
  );

  if (publicacao.descricao) {
    corpo.appendChild(
      criarElemento("p", "", publicacao.descricao)
    );
  }

  cartao.appendChild(corpo);
  return cartao;
}

async function carregarPublico() {
  const publicacoes = await buscarPublicacoes();

  if (!db) return;

  const novidades = publicacoes.filter((p) =>
    ["evento", "promocao", "aviso"].includes(p.categoria)
  );

  const galeria = publicacoes.filter((p) =>
    ["foto", "video"].includes(p.categoria)
  );

  const areaNovidades = $("lista-novidades");
  const areaGaleria = $("lista-galeria");

  areaNovidades.replaceChildren();
  areaGaleria.replaceChildren();

  if (!novidades.length) {
    areaNovidades.appendChild(
      criarElemento(
        "p",
        "estado",
        "Ainda não há novidades publicadas. Volte em breve! 💙"
      )
    );
  } else {
    novidades.forEach((p) => {
      areaNovidades.appendChild(criarCartao(p));
    });
  }

  if (!galeria.length) {
    areaGaleria.appendChild(
      criarElemento(
        "p",
        "estado",
        "As fotos e os vídeos da diversão aparecerão aqui! 📸"
      )
    );
  } else {
    galeria.forEach((p) => {
      areaGaleria.appendChild(criarCartao(p));
    });
  }
}

/* ==========================================
   PAINEL ADMINISTRATIVO
   ========================================== */

$("atualizar-publicacoes").addEventListener("click", carregarAdmin);

async function carregarAdmin() {
  const area = $("lista-admin");
  area.replaceChildren();

  if (!adminLiberado) {
    mostrarLogin();
    return;
  }

  if (!verificarConfiguracao()) {
    area.appendChild(
      criarElemento("p", "estado", "Configure o Supabase antes de continuar.")
    );
    return;
  }

  area.appendChild(criarElemento("p", "estado", "Carregando publicações..."));

  const { data, error } = await db
    .from("publicacoes")
    .select("*")
    .order("criado_em", { ascending: false });

  area.replaceChildren();

  if (error) {
    console.error(error);

    area.appendChild(
      criarElemento(
        "p",
        "estado",
        "Não foi possível carregar a lista. Verifique as permissões do Supabase."
      )
    );
    return;
  }

  if (!data || data.length === 0) {
    area.appendChild(
      criarElemento("p", "estado", "Nenhuma publicação cadastrada ainda.")
    );
    return;
  }

  data.forEach((publicacao) => {
    const item = criarElemento("div", "item-admin");
    const info = criarElemento("div");

    info.appendChild(
      criarElemento("strong", "", publicacao.titulo)
    );

    info.appendChild(
      criarElemento(
        "p",
        "",
        `${categorias[publicacao.categoria] || publicacao.categoria} · ${
          new Date(publicacao.criado_em).toLocaleDateString("pt-BR")
        }`
      )
    );

    const botaoExcluir = criarElemento("button", "excluir", "Excluir");
    botaoExcluir.type = "button";

    botaoExcluir.addEventListener("click", () => {
      excluirPublicacao(publicacao);
    });

    item.append(info, botaoExcluir);
    area.appendChild(item);
  });
}

/* ==========================================
   PUBLICAR AVISO, EVENTO, PROMOÇÃO,
   FOTO OU VÍDEO
   ========================================== */

$("form-publicacao").addEventListener("submit", async (evento) => {
  evento.preventDefault();

  if (!adminLiberado) {
    mostrarLogin();
    return;
  }

  if (!verificarConfiguracao()) return;

  const titulo = $("titulo").value.trim();
  const descricao = $("descricao").value.trim();
  const categoria = $("categoria").value;
  const arquivo = $("arquivo").files[0];

  if (!titulo) {
    mensagem("mensagem-publicacao", "Digite um título.", true);
    return;
  }

  if (arquivo && arquivo.size > 50 * 1024 * 1024) {
    mensagem(
      "mensagem-publicacao",
      "O arquivo ultrapassa o limite de 50 MB.",
      true
    );
    return;
  }

  if (
    arquivo &&
    !arquivo.type.startsWith("image/") &&
    !arquivo.type.startsWith("video/")
  ) {
    mensagem("mensagem-publicacao", "Escolha uma foto ou vídeo válido.", true);
    return;
  }

  if (categoria === "foto" && arquivo && !arquivo.type.startsWith("image/")) {
    mensagem("mensagem-publicacao", "Escolha uma imagem para publicar uma foto.", true);
    return;
  }

  if (categoria === "video" && arquivo && !arquivo.type.startsWith("video/")) {
    mensagem("mensagem-publicacao", "Escolha um vídeo para esta publicação.", true);
    return;
  }

  const botao = $("form-publicacao").querySelector('button[type="submit"]');
  botao.disabled = true;
  botao.textContent = "Publicando...";

  let arquivoPath = null;
  let arquivoUrl = null;

  try {
    if (arquivo) {
      const nomeSeguro = arquivo.name
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9._-]/g, "_");

      arquivoPath = `${crypto.randomUUID()}-${nomeSeguro}`;

      const { error: erroUpload } = await db.storage
        .from(BUCKET)
        .upload(arquivoPath, arquivo, {
          cacheControl: "3600",
          upsert: false,
          contentType: arquivo.type
        });

      if (erroUpload) throw erroUpload;

      const resultadoUrl = db.storage
        .from(BUCKET)
        .getPublicUrl(arquivoPath);

      arquivoUrl = resultadoUrl.data.publicUrl;
    }

    const { error: erroBanco } = await db
      .from("publicacoes")
      .insert({
        titulo,
        descricao,
        categoria,
        arquivo_url: arquivoUrl,
        arquivo_path: arquivoPath
      });

    if (erroBanco) {
      if (arquivoPath) {
        await db.storage.from(BUCKET).remove([arquivoPath]);
      }

      throw erroBanco;
    }

    $("form-publicacao").reset();

    mensagem(
      "mensagem-publicacao",
      "Publicação enviada com sucesso! 🎉"
    );

    await carregarAdmin();
    await carregarPublico();

  } catch (erro) {
    console.error("Erro ao publicar:", erro);

    mensagem(
      "mensagem-publicacao",
      `Não foi possível publicar: ${erro.message || "verifique as permissões do Supabase."}`,
      true
    );

  } finally {
    botao.disabled = false;
    botao.textContent = "Publicar no site";
  }
});

/* ==========================================
   EXCLUIR PUBLICAÇÃO
   ========================================== */

async function excluirPublicacao(publicacao) {
  if (!adminLiberado) {
    mostrarLogin();
    return;
  }

  if (!confirm(`Deseja excluir "${publicacao.titulo}"?`)) {
    return;
  }

  try {
    const { error } = await db
      .from("publicacoes")
      .delete()
      .eq("id", publicacao.id);

    if (error) throw error;

    if (publicacao.arquivo_path) {
      const { error: erroArquivo } = await db.storage
        .from(BUCKET)
        .remove([publicacao.arquivo_path]);

      if (erroArquivo) {
        console.warn("Não foi possível remover o arquivo:", erroArquivo);
      }
    }

    await carregarAdmin();
    await carregarPublico();

  } catch (erro) {
    console.error("Erro ao excluir:", erro);

    alert(
      "Não foi possível excluir. Confira as permissões do Supabase."
    );
  }
}

/* ==========================================
   INICIAR O SITE
   ========================================== */

async function iniciarSite() {
  if (!db) {
    mostrarErroPublico(
      "Configure a URL e a chave pública do Supabase no script.js."
    );
    return;
  }

  await carregarPublico();
}

iniciarSite();
      
