
/* ==========================================
   ESTAÇÃO ALEGRIA — SCRIPT.JS
   Login com somente senha na tela
   ========================================== */

// 1. DADOS DO SUPABASE
const SUPABASE_URL = "https://bpurhmqawowwqvjwllrx.supabase.co";
const SUPABASE_PUBLIC_KEY = "sb_publishable_buca8xv2z8MTn5OcNAYLZQ_4kKo2Bje";
const BUCKET = "estacao-media";
const ADMIN_API_URL = `${SUPABASE_URL}/functions/v1/admin-api`;

const configurado =
  SUPABASE_URL.startsWith("https://") &&
  SUPABASE_PUBLIC_KEY.length > 10;

const db = configurado && window.supabase
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY)
  : null;

const $ = (id) => document.getElementById(id);
let adminLiberado = false;
let senhaAdminSessao = "";

const TUS_SCRIPT_URL =
  "https://cdn.jsdelivr.net/npm/tus-js-client@4/dist/tus.min.js";

function carregarTus() {
  if (window.tus?.Upload) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const scriptExistente = document.querySelector(
      `script[src="${TUS_SCRIPT_URL}"]`
    );

    if (scriptExistente) {
      scriptExistente.addEventListener("load", resolve, { once: true });
      scriptExistente.addEventListener(
        "error",
        () => reject(new Error("Não foi possível carregar o sistema de upload.")),
        { once: true }
      );
      return;
    }

    const script = document.createElement("script");
    script.src = TUS_SCRIPT_URL;
    script.onload = resolve;
    script.onerror = () =>
      reject(new Error("Não foi possível carregar o sistema de upload."));
    document.head.appendChild(script);
  });
}

async function enviarArquivoGrande(file, aoProgredir) {
  const MAX_FILE_SIZE = 500 * 1024 * 1024;

  if (!file || file.size <= 0) {
    throw new Error("Selecione um arquivo válido.");
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error("O arquivo ultrapassa o limite de 500 MB.");
  }

  if (!senhaAdminSessao) {
    throw new Error("Entre novamente no painel administrativo.");
  }

  if (!db) {
    throw new Error("Não foi possível conectar ao Supabase.");
  }

  await carregarTus();

  const resposta = await fetch(ADMIN_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_PUBLIC_KEY,
      "x-admin-password": senhaAdminSessao
    },
    body: JSON.stringify({
      action: "create-upload-url",
      fileName: file.name,
      contentType: file.type || "application/octet-stream",
      size: file.size
    })
  });

  const autorizacao = await resposta.json();

  if (!resposta.ok || !autorizacao.success) {
    throw new Error(
      autorizacao.error || "Não foi possível autorizar o envio."
    );
  }

  const projectId = new URL(SUPABASE_URL).hostname.split(".")[0];

  return new Promise((resolve, reject) => {
    const upload = new window.tus.Upload(file, {
      endpoint: `https://${projectId}.storage.supabase.co/storage/v1/upload/resumable`,
      headers: {
        "x-signature": autorizacao.token,
        "apikey": SUPABASE_PUBLIC_KEY
      },
      uploadDataDuringCreation: true,
      chunkSize: 6 * 1024 * 1024,
      retryDelays: [0, 3000, 5000, 10000, 20000],
      removeFingerprintOnSuccess: true,
      metadata: {
        bucketName: autorizacao.bucket,
        objectName: autorizacao.path,
        contentType: file.type || "application/octet-stream",
        cacheControl: "3600"
      },
      onError(error) {
        reject(error);
      },
      onProgress(enviados, total) {
        if (typeof aoProgredir === "function") {
          aoProgredir(Math.round((enviados / total) * 100));
        }
      },
      onSuccess() {
        const { data } = db.storage
          .from(autorizacao.bucket)
          .getPublicUrl(autorizacao.path);

        resolve({
          path: autorizacao.path,
          url: data.publicUrl
        });
      }
    });

    upload.start();
  });
}

const categorias = {
  aviso: "📣 Aviso",
  evento: "🎉 Evento",
  promocao: "🏷️ Promoção",
  foto: "📸 Foto",
  video: "🎬 Vídeo"
};

/* FUNÇÕES GERAIS */

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
    alert("Configure a URL e a chave pública do Supabase no início do script.js.");
    return false;
  }

  return true;
}

/* LOGIN ADMINISTRATIVO */

$("abrir-admin").addEventListener("click", mostrarLogin);
$("atalho-admin").addEventListener("click", mostrarLogin);

$("form-login").addEventListener("submit", async (evento) => {
  evento.preventDefault();

  const senha = $("senha-admin").value;

  if (!senha) {
    mensagem("mensagem-login", "Digite a senha.", true);
    return;
  }

  const botao = $("form-login").querySelector('button[type="submit"]');
  if (botao) botao.disabled = true;

  mensagem("mensagem-login", "Verificando senha...");

  try {
    const resposta = await fetch(ADMIN_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_PUBLIC_KEY,
        "x-admin-password": senha
      },
      body: JSON.stringify({ action: "login" })
    });

    const resultado = await resposta.json().catch(() => ({}));

    if (!resposta.ok || !resultado.success) {
      throw new Error(
        resultado.error || "Senha incorreta ou não foi possível validar o acesso."
      );
    }

    senhaAdminSessao = senha;
    adminLiberado = true;
    $("senha-admin").value = "";
    mensagem("mensagem-login", "");
    mostrarPainel();

  } catch (erro) {
    senhaAdminSessao = "";
    adminLiberado = false;
    mensagem(
      "mensagem-login",
      erro.message || "Falha ao validar o acesso.",
      true
    );

  } finally {
    if (botao) botao.disabled = false;
  }
});

$("sair-admin").addEventListener("click", () => {
  adminLiberado = false;
  senhaAdminSessao = "";
  mostrarInicio();
});

/* CARREGAR PUBLICAÇÕES PÚBLICAS */

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

  corpo.appendChild(criarElemento("h3", "", publicacao.titulo));

  if (publicacao.descricao) {
    corpo.appendChild(criarElemento("p", "", publicacao.descricao));
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

/* PAINEL ADMINISTRATIVO */

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

  area.appendChild(
    criarElemento("p", "estado", "Carregando publicações...")
  );

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

/* PUBLICAR AVISO, EVENTO, PROMOÇÃO, FOTO OU VÍDEO */

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
      "O arquivo ultrapassa o limite de 50 MB do plano gratuito.",
      true
    );
   
    return;
  }

  if (
    arquivo &&
    !arquivo.type.startsWith("image/") &&
    !arquivo.type.startsWith("video/")
  ) {
    mensagem(
      "mensagem-publicacao",
      "Escolha uma foto ou vídeo válido.",
      true
    );
    return;
  }

  if (categoria === "foto" && arquivo && !arquivo.type.startsWith("image/")) {
    mensagem(
      "mensagem-publicacao",
      "Escolha uma imagem para publicar uma foto.",
      true
    );
    return;
  }

  if (categoria === "video" && arquivo && !arquivo.type.startsWith("video/")) {
    mensagem(
      "mensagem-publicacao",
      "Escolha um vídeo para esta publicação.",
      true
    );
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

      const buffer = await arquivo.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binario = "";
      const tamanhoBloco = 0x8000;

      for (let i = 0; i < bytes.length; i += tamanhoBloco) {
        binario += String.fromCharCode(
          ...bytes.subarray(i, i + tamanhoBloco)
        );
      }

    
const uploadResultado = await enviarArquivoGrande(
  arquivo,
  (percentual) => {
    console.log(`Enviando arquivo: ${percentual}%`);
  }
);

arquivoPath = uploadResultado.path;
arquivoUrl = uploadResultado.url;
       }

    const respostaPublicacao = await fetch(ADMIN_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_PUBLIC_KEY,
        "x-admin-password": senhaAdminSessao
      },
      body: JSON.stringify({
        action: "publish",
        publicacao: {
          titulo,
          descricao,
          categoria,
          arquivo_url: arquivoUrl,
          arquivo_path: arquivoPath
        }
      })
    });

    const resultadoPublicacao = await respostaPublicacao.json().catch(() => ({}));

    if (!respostaPublicacao.ok) {
      throw new Error(
        resultadoPublicacao.error || "Falha ao salvar a publicação."
      );
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
      `Não foi possível publicar: ${
        erro.message || "verifique as permissões do Supabase."
      }`,
      true
    );

  } finally {
    botao.disabled = false;
    botao.textContent = "Publicar no site";
  }
});

/* EXCLUIR PUBLICAÇÃO */

async function excluirPublicacao(publicacao) {
  if (!adminLiberado) {
    mostrarLogin();
    return;
  }

  if (!confirm(`Deseja excluir "${publicacao.titulo}"?`)) {
    return;
  }

  try {
    const resposta = await fetch(ADMIN_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_PUBLIC_KEY,
        "x-admin-password": senhaAdminSessao
      },
      body: JSON.stringify({
        action: "delete",
        id: publicacao.id
      })
    });

    const resultado = await resposta.json().catch(() => ({}));

    if (!resposta.ok) {
      throw new Error(
        resultado.error || "Falha ao excluir a publicação."
      );
    }

    await carregarAdmin();
    await carregarPublico();

  } catch (erro) {
    console.error("Erro ao excluir:", erro);

    alert(
      `Não foi possível excluir: ${
        erro.message || "verifique a configuração da função admin-api."
      }`
    );
  }
}

/* INICIAR O SITE */

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
