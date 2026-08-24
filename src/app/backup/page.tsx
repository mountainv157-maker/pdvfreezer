"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Tab =
  | "home"
  | "pdv"
  | "dash"
  | "fechamentos"
  | "log"
  | "settings";

type Produto = {
  id: number;
  nome: string;
  preco: string;
  qtd: number;
  imagem: string;
};

type CartItem = Produto & { cartQtd: number };

type Venda = {
  id: number;
  itens: string;
  total: number;
  pagamento: string;
  descricao: string;
  created_at: string;
  fechamento_id?: number | null;
  fechado?: number | boolean;
};

type ProdutoResumo = { qtd: number; total: number };

type PagamentoResumo = {
  total: number;
  produtos: Record<string, ProdutoResumo>;
};

type DescricaoResumo = {
  nome: string;
  total: number;
  produtos: Record<string, ProdutoResumo>;
};

type Resumo = {
  mapa: Record<string, ProdutoResumo>;
  porPagamento: Record<string, PagamentoResumo>;
  porDescricao: [string, DescricaoResumo][];
  semDescricao: DescricaoResumo;
  totalGeral: number;
};

type Fechamento = {
  id: number;
  numero?: number;
  created_at: string;
  total?: number;
  dados?: any;
  resumo?: any;
};

const NAV_TABS: { id: Tab; icon: string }[] = [
  { id: "home", icon: "home" },
  { id: "pdv", icon: "inventory_2" },
  { id: "dash", icon: "monitoring" },
  { id: "fechamentos", icon: "receipt_long" },
  { id: "settings", icon: "settings" },
];

const GALERIA = [
  ["Coca-Cola 2L", "/img/coca2lt.png"],
  ["Coca Lata 350ml", "/img/cocalata.png"],
  ["Coca Zero Lata 350ml", "/img/cocalatazero.png"],
  ["Fanta Laranja 2L", "/img/fanta2lt.png"],
  ["Fanta Lata", "/img/fantalata.png"],
  ["Guaraná 2L", "/img/guarana2lt.png"],
  ["Guaraná Lata", "/img/guaranalata.png"],
  ["Guaraná Lata Zero", "/img/guaranalatazero.png"],
  ["Água 500ml", "/img/agua.png"],
];

function normalizarDescricao(v: string) {
  return String(v || "").trim().toLocaleLowerCase("pt-BR");
}

function dinheiro(v: number) {
  return Number(v || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function parseItens(itens: any): CartItem[] {
  try {
    const value = typeof itens === "string" ? JSON.parse(itens) : itens;
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function parseJson(value: any): any {
  if (value == null) return null;
  if (typeof value !== "string") return value;

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function formatarData(value: string) {
  if (!value) return "-";

  const d = new Date(value);

  return Number.isNaN(d.getTime()) ? value : d.toLocaleString("pt-BR");
}

function formatarDataFechamento(value: string) {
  if (!value) return "-";

  const d = new Date(value);

  return Number.isNaN(d.getTime())
    ? value
    : d.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      });
}

function numeroFechamento(f: Fechamento, index: number) {
  return String(f.numero || f.id || index + 1).padStart(3, "0");
}

function normalizarResumo(raw: any): Resumo | null {
  const data = parseJson(raw);

  if (!data || typeof data !== "object") return null;

  const porPagamento = parseJson(data.porPagamento) || {};

  let porDescricao: any = parseJson(data.porDescricao) || [];

  const mapa = parseJson(data.mapa) || {};

  const semDescricao =
    parseJson(data.semDescricao) || {
      nome: "Sem descrição",
      total: 0,
      produtos: {},
    };

  if (!Array.isArray(porDescricao)) {
    porDescricao = Object.entries(porDescricao);
  }

  return {
    mapa,
    porPagamento,
    porDescricao,
    semDescricao,
    totalGeral: Number(data.totalGeral ?? data.total ?? 0),
  };
}

export default function App() {
  const [logged, setLogged] = useState(false);
  const [loginForm, setLoginForm] = useState({ user: "", pass: "" });
  const [tab, setTab] = useState<Tab>("home");
  const [dark, setDark] = useState(true);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [vendasHistorico, setVendasHistorico] = useState<Venda[]>([]);
  const [fechamentos, setFechamentos] = useState<Fechamento[]>([]);
  const [pagamento, setPagamento] = useState("pix");
  const [descricao, setDescricao] = useState("");
  const [showCheckout, setShowCheckout] = useState(false);
  const [showConfirmFechamento, setShowConfirmFechamento] = useState(false);
  const [fazendoFechamento, setFazendoFechamento] = useState(false);
  const [apagandoFechamento, setApagandoFechamento] = useState<number | null>(
    null
  );
  const [toast, setToast] = useState<string | null>(null);
  const [savedPass, setSavedPass] = useState("pdvadmin123");
  const [logBusca, setLogBusca] = useState("");
  const [fechamentoAberto, setFechamentoAberto] = useState<number | null>(null);
  const afkRef = useRef<any>(null);

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    setLogged(sessionStorage.getItem("freezer_logged") === "true");
    setSavedPass(localStorage.getItem("freezer_pass") || "pdvadmin123");
    setDark(localStorage.getItem("theme") !== "light");
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("light", !dark);
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);

  useEffect(() => {
    if (!logged) return;

    const reset = () => {
      clearTimeout(afkRef.current);

      afkRef.current = setTimeout(() => {
        sessionStorage.removeItem("freezer_logged");
        setLogged(false);
      }, 5 * 60 * 1000);
    };

    const events = [
      "mousemove",
      "keydown",
      "touchstart",
      "click",
      "scroll",
    ];

    events.forEach((e) => window.addEventListener(e, reset));

    reset();

    return () => {
      events.forEach((e) => window.removeEventListener(e, reset));
      clearTimeout(afkRef.current);
    };
  }, [logged]);

  async function fetchProdutos() {
    try {
      const r = await fetch("/api/produtos", {
        cache: "no-store",
      });

      const data = await r.json();

      if (Array.isArray(data)) {
        setProdutos(data);
      }
    } catch {
      showToast("Erro ao carregar produtos");
    }
  }

  async function fetchVendas() {
    try {
      const r = await fetch("/api/vendas", {
        cache: "no-store",
      });

      const data = await r.json();

      if (Array.isArray(data)) {
        setVendas(data);
      }
    } catch {
      showToast("Erro ao carregar vendas");
    }
  }

  async function fetchHistoricoVendas() {
    try {
      const r = await fetch("/api/vendas?historico=true", {
        cache: "no-store",
      });

      const data = await r.json();

      if (Array.isArray(data)) {
        setVendasHistorico(data);
      } else {
        setVendasHistorico(vendas);
      }
    } catch {
      setVendasHistorico(vendas);
    }
  }

  async function fetchFechamentos() {
    try {
      const r = await fetch("/api/fechamentos", {
        cache: "no-store",
      });

      if (!r.ok) return;

      const data = await r.json();

      const lista = Array.isArray(data)
        ? data
        : Array.isArray(data?.fechamentos)
        ? data.fechamentos
        : Array.isArray(data?.data)
        ? data.data
        : [];

      const normalizada = lista.map((f: any) => ({
        ...f,
        dados: parseJson(f.dados) || parseJson(f.resumo) || f.dados,
        resumo: parseJson(f.resumo) || parseJson(f.dados) || f.resumo,
      }));

      setFechamentos(normalizada);
    } catch {
      showToast("Erro ao carregar fechamentos");
    }
  }

  useEffect(() => {
    if (!logged) return;

    fetchProdutos();
    fetchVendas();
    fetchFechamentos();
  }, [logged]);

  useEffect(() => {
    if (!logged) return;

    if (tab === "log") {
      fetchHistoricoVendas();
    }

    if (tab === "fechamentos") {
      fetchFechamentos();
    }
  }, [tab, logged]);

  function doLogin() {
    if (
      loginForm.user === "freezer" &&
      loginForm.pass === savedPass
    ) {
      setLogged(true);

      sessionStorage.setItem("freezer_logged", "true");

      setLoginForm({
        user: "",
        pass: "",
      });
    } else {
      showToast("Usuário ou senha incorretos");
    }
  }

  function addToCart(produto: Produto) {
    if (produto.qtd <= 0) {
      return showToast("Sem estoque");
    }

    setCart((prev) => {
      const existing = prev.find((i) => i.id === produto.id);

      if (existing) {
        if (existing.cartQtd >= produto.qtd) {
          showToast("Estoque máximo: " + produto.qtd);
          return prev;
        }

        return prev.map((i) =>
          i.id === produto.id
            ? {
                ...i,
                cartQtd: i.cartQtd + 1,
              }
            : i
        );
      }

      return [
        ...prev,
        {
          ...produto,
          cartQtd: 1,
        },
      ];
    });
  }

  async function finalizarVenda() {
    if (!cart.length) {
      return showToast("Carrinho vazio");
    }

    const total = cart.reduce(
      (s, i) =>
        s + (parseFloat(i.preco) || 0) * i.cartQtd,
      0
    );

    try {
      const r = await fetch("/api/vendas", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          itens: cart,
          total,
          pagamento,
          descricao,
        }),
      });

      const data = await r.json();

      if (!r.ok) {
        throw new Error(
          data.error || "Erro ao salvar venda"
        );
      }

      setCart([]);
      setDescricao("");
      setShowCheckout(false);

      await fetchProdutos();
      await fetchVendas();

      setTab("dash");

      showToast("Venda salva!");
    } catch (e: any) {
      showToast(
        e?.message || "Erro ao salvar venda"
      );
    }
  }

  function criarResumo(lista: Venda[]): Resumo {
    const mapa: Record<string, ProdutoResumo> = {};
    const porPagamento: Record<
      string,
      PagamentoResumo
    > = {};
    const porDescricao: Record<
      string,
      DescricaoResumo
    > = {};

    const semDescricao: DescricaoResumo = {
      nome: "Sem descrição",
      total: 0,
      produtos: {},
    };

    lista.forEach((venda) => {
      const itens = parseItens(venda.itens);

      const pg = String(
        venda.pagamento || "outro"
      )
        .trim()
        .toLowerCase();

      if (!porPagamento[pg]) {
        porPagamento[pg] = {
          total: 0,
          produtos: {},
        };
      }

      porPagamento[pg].total += Number(
        venda.total || 0
      );

      const original = String(
        venda.descricao || ""
      ).trim();

      const chave = normalizarDescricao(original);

      let grupo: DescricaoResumo;

      if (chave) {
        if (!porDescricao[chave]) {
          porDescricao[chave] = {
            nome: original,
            total: 0,
            produtos: {},
          };
        }

        grupo = porDescricao[chave];

        grupo.total += Number(
          venda.total || 0
        );
      } else {
        grupo = semDescricao;

        semDescricao.total += Number(
          venda.total || 0
        );
      }

      itens.forEach((item) => {
        const nome = String(
          item.nome || ""
        ).trim();

        const qtd = Number(
          item.cartQtd
        ) || 0;

        const valor =
          (parseFloat(item.preco) || 0) * qtd;

        if (!mapa[nome]) {
          mapa[nome] = {
            qtd: 0,
            total: 0,
          };
        }

        mapa[nome].qtd += qtd;
        mapa[nome].total += valor;

        if (!porPagamento[pg].produtos[nome]) {
          porPagamento[pg].produtos[nome] = {
            qtd: 0,
            total: 0,
          };
        }

        porPagamento[pg].produtos[nome].qtd += qtd;
        porPagamento[pg].produtos[nome].total += valor;

        if (!grupo.produtos[nome]) {
          grupo.produtos[nome] = {
            qtd: 0,
            total: 0,
          };
        }

        grupo.produtos[nome].qtd += qtd;
        grupo.produtos[nome].total += valor;
      });
    });

    return {
      mapa,
      porPagamento,
      porDescricao: Object.entries(
        porDescricao
      ).sort((a, b) =>
        a[1].nome.localeCompare(
          b[1].nome,
          "pt-BR",
          {
            sensitivity: "base",
          }
        )
      ),
      semDescricao,
      totalGeral: lista.reduce(
        (s, v) =>
          s + Number(v.total || 0),
        0
      ),
    };
  }

  async function fazerFechamento() {
    if (!vendas.length) {
      setShowConfirmFechamento(false);

      return showToast(
        "Não existem vendas para fechar."
      );
    }

    setFazendoFechamento(true);

    try {
      const resumo = criarResumo(vendas);

      const r = await fetch("/api/fechamentos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          vendas,
          resumo,
          dados: resumo,
          total: resumo.totalGeral,
        }),
      });

      const data = await r.json();

      if (!r.ok) {
        throw new Error(
          data.error ||
            "Erro ao fazer fechamento"
        );
      }

      await fetchVendas();
      await fetchFechamentos();
      await fetchHistoricoVendas();

      setVendas([]);
      setCart([]);
      setDescricao("");
      setPagamento("pix");

      setShowConfirmFechamento(false);
      setTab("fechamentos");

      showToast(
        data.message ||
          "Fechamento realizado! Novo ciclo iniciado."
      );
    } catch (e: any) {
      showToast(
        e?.message ||
          "Erro ao fazer fechamento"
      );
    } finally {
      setFazendoFechamento(false);
    }
  }

  async function deletarFechamento(id: number) {
    if (
      !confirm(
        `Apagar o relatório de fechamento #${id}? Esta ação não apaga as vendas do Log.`
      )
    ) {
      return;
    }

    setApagandoFechamento(id);

    try {
      const r = await fetch(
        `/api/fechamentos?id=${id}`,
        {
          method: "DELETE",
        }
      );

      const data = await r.json().catch(
        () => ({})
      );

      if (!r.ok) {
        throw new Error(
          data.error ||
            "Erro ao apagar relatório"
        );
      }

      setFechamentos((prev) =>
        prev.filter((f) => f.id !== id)
      );

      setFechamentoAberto(null);

      showToast("Relatório apagado");
    } catch (e: any) {
      showToast(
        e?.message ||
          "A API precisa ter DELETE /api/fechamentos?id=ID para apagar o relatório."
      );
    } finally {
      setApagandoFechamento(null);
    }
  }

  async function deletarProduto(id: number) {
    if (!confirm("Remover do freezer?")) return;

    try {
      const r = await fetch(
        "/api/produtos?id=" + id,
        {
          method: "DELETE",
        }
      );

      if (!r.ok) {
        throw new Error("Erro");
      }

      await fetchProdutos();

      showToast("Produto removido");
    } catch {
      showToast("Erro ao remover produto");
    }
  }

  async function deletarVenda(id: number) {
    if (
      !confirm(
        "Apagar venda #" +
          id +
          "? O estoque vai voltar."
      )
    ) {
      return;
    }

    try {
      const r = await fetch(
        "/api/vendas?id=" + id,
        {
          method: "DELETE",
        }
      );

      const data = await r.json().catch(
        () => ({})
      );

      if (!r.ok) {
        throw new Error(
          data.error ||
            "Erro ao apagar venda"
        );
      }

      await fetchVendas();
      await fetchHistoricoVendas();
      await fetchProdutos();

      showToast("Venda apagada");
    } catch (e: any) {
      showToast(
        e?.message ||
          "Erro ao apagar venda"
      );
    }
  }

  const resumoAtual = useMemo(
    () => criarResumo(vendas),
    [vendas]
  );

  const totalCarrinho = cart.reduce(
    (s, i) =>
      s +
      (parseFloat(i.preco) || 0) *
        i.cartQtd,
    0
  );

  const totalQtdCarrinho = cart.reduce(
    (s, i) => s + i.cartQtd,
    0
  );

  const produtosAtivos = produtos.filter(
    (p) => p.qtd > 0
  );

  const vendasLogFiltradas = useMemo(() => {
    const busca = logBusca
      .trim()
      .toLocaleLowerCase("pt-BR");

    if (!busca) {
      return vendasHistorico;
    }

    return vendasHistorico.filter((v) => {
      const itens = parseItens(v.itens);

      const nomes = itens
        .map((i) => i.nome)
        .join(" ");

      return [
        v.id,
        formatarData(v.created_at),
        v.descricao || "",
        v.pagamento || "",
        nomes,
      ]
        .join(" ")
        .toLocaleLowerCase("pt-BR")
        .includes(busca);
    });
  }, [
    vendasHistorico,
    logBusca,
  ]);

  const bg = dark
    ? "bg-[#0A0A0C] text-zinc-100"
    : "bg-[#F6F6F7] text-zinc-900";

  const card = dark
    ? "bg-zinc-900 border-zinc-800"
    : "bg-white border-zinc-200";

  if (!logged) {
    return (
      <div
        className={`min-h-screen flex items-center justify-center p-6 ${bg}`}
      >
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
        />

        {toast && <Toast text={toast} />}

        <div
          className={`w-full max-w-[380px] p-8 rounded-[24px] border ${card}`}
        >
          <h1 className="text-3xl font-bold">
            Freezer da Amanda
          </h1>

          <input
            placeholder="Usuário"
            value={loginForm.user}
            onChange={(e) =>
              setLoginForm({
                ...loginForm,
                user: e.target.value,
              })
            }
            className={`mt-8 w-full p-3 rounded-xl bg-transparent border ${
              dark
                ? "border-zinc-800"
                : "border-zinc-200"
            }`}
          />

          <input
            placeholder="Senha"
            type="password"
            value={loginForm.pass}
            onChange={(e) =>
              setLoginForm({
                ...loginForm,
                pass: e.target.value,
              })
            }
            onKeyDown={(e) =>
              e.key === "Enter" && doLogin()
            }
            className={`mt-3 w-full p-3 rounded-xl bg-transparent border ${
              dark
                ? "border-zinc-800"
                : "border-zinc-200"
            }`}
          />

          <button
            onClick={doLogin}
            className="w-full mt-5 py-3 rounded-xl bg-[#D6FF57] text-black font-bold"
          >
            Entrar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen flex flex-col items-center overflow-x-hidden ${bg}`}
    >
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
      />

      {toast && <Toast text={toast} />}

      <header className="w-full max-w-[1200px] px-5 sm:px-6 py-4 flex justify-between">
        <b>Freezer da Amanda</b>

        <span className="text-xs opacity-50">
          {vendas.length
            ? `${vendas.length} venda${
                vendas.length > 1 ? "s" : ""
              } em aberto`
            : "Nenhuma venda em aberto"}
        </span>
      </header>

      <main className="w-full max-w-[1200px] flex-1 px-4 sm:px-6 pb-[170px] pt-2">
        {tab === "home" && (
          <section>
            <h1 className="text-3xl font-bold">
              Home
            </h1>

            <p className="text-xs opacity-60">
              {produtosAtivos.length} produtos
              disponíveis
            </p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
              {produtosAtivos.map((p) => (
                <div
                  key={p.id}
                  className={`rounded-2xl border overflow-hidden ${card}`}
                >
                  <img
                    src={p.imagem}
                    className="w-full h-28 object-contain bg-white p-2"
                  />

                  <div className="p-3">
                    <p className="text-sm font-semibold truncate">
                      {p.nome}
                    </p>

                    <p className="text-[11px] opacity-50">
                      Estoque: {p.qtd}
                    </p>

                    <div className="flex justify-between items-center mt-2 gap-2">
                      <b className="text-sm">
                        R$ {p.preco}
                      </b>

                      <button
                        onClick={() =>
                          addToCart(p)
                        }
                        className="w-8 h-8 rounded-full bg-[#D6FF57] text-black flex items-center justify-center"
                      >
                        <span className="material-symbols-rounded">
                          add
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {tab === "pdv" && (
          <section className="max-w-[700px] mx-auto">
            <h1 className="text-3xl font-bold">
              PDV - Produtos
            </h1>

            <p className="text-xs opacity-60">
              Adiciona e remove produtos do banco
            </p>

            <AddProduto
              fetchProdutos={fetchProdutos}
              showToast={showToast}
            />

            <h2 className="text-xl font-bold mt-6 mb-3">
              Produtos no banco
            </h2>

            <div
              className={`rounded-2xl border divide-y ${card} divide-zinc-800 overflow-hidden`}
            >
              {produtos.map((p) => (
                <div
                  key={p.id}
                  className={`p-4 flex gap-3 items-center ${
                    p.qtd <= 0
                      ? "opacity-40"
                      : ""
                  }`}
                >
                  <img
                    src={p.imagem}
                    className="w-12 h-12 rounded-xl bg-white p-1 object-contain"
                  />

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">
                      {p.nome}{" "}
                      {p.qtd <= 0 &&
                        "(ESGOTADO)"}
                    </p>

                    <p className="text-xs opacity-60">
                      R$ {p.preco} • {p.qtd} un
                    </p>
                  </div>

                  <button
                    onClick={async () => {
                      const quantidade =
                        prompt(
                          "Nova qtd:",
                          String(p.qtd)
                        );

                      if (
                        quantidade === null
                      )
                        return;

                      await fetch(
                        "/api/produtos",
                        {
                          method: "PUT",
                          headers: {
                            "Content-Type":
                              "application/json",
                          },
                          body: JSON.stringify({
                            id: p.id,
                            qtd: Number(
                              quantidade
                            ),
                          }),
                        }
                      );

                      fetchProdutos();
                    }}
                    className="px-3 py-1 rounded-full bg-zinc-800 text-white text-xs"
                  >
                    Editar
                  </button>

                  <button
                    onClick={() =>
                      deletarProduto(p.id)
                    }
                    className="w-8 h-8 rounded-full bg-red-500/20 text-red-400"
                  >
                    <span className="material-symbols-rounded text-[18px]">
                      delete
                    </span>
                  </button>
                </div>
              ))}

              {!produtos.length && (
                <p className="p-6 text-center text-xs opacity-50">
                  Nenhum produto cadastrado.
                </p>
              )}
            </div>
          </section>
        )}

        {tab === "dash" && (
          <section className="max-w-[800px] mx-auto space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
              <div>
                <h1 className="text-3xl font-bold">
                  Dashboard
                </h1>

                <p className="text-xs opacity-60">
                  Ciclo atual • vendas ainda não
                  fechadas
                </p>
              </div>

              {vendas.length > 0 && (
                <button
                  onClick={() =>
                    setShowConfirmFechamento(
                      true
                    )
                  }
                  className="px-5 py-3 rounded-xl bg-[#D6FF57] text-black font-bold flex items-center justify-center gap-1 hover:opacity-90 transition-opacity"
                >
                  <span className="material-symbols-rounded">
                    task_alt
                  </span>
                  Fazer fechamento
                </button>
              )}
            </div>

            <div
              className={`p-5 rounded-2xl border ${card}`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider opacity-60">
                    💰 Fechamento Geral
                  </p>

                  <p className="text-3xl font-extrabold mt-1">
                    {dinheiro(
                      resumoAtual.totalGeral
                    )}
                  </p>
                </div>

                <span className="text-xs px-3 py-1 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700">
                  {vendas.length}{" "}
                  {vendas.length === 1
                    ? "venda"
                    : "vendas"}
                </span>
              </div>

              <div className="mt-5 space-y-3">
                {Object.entries(
                  resumoAtual.porPagamento
                ).map(([pg, dados]) => (
                  <ResumoPagamento
                    key={pg}
                    nome={pg}
                    dados={dados}
                  />
                ))}

                {!Object.keys(
                  resumoAtual.porPagamento
                ).length && (
                  <p className="text-xs opacity-50 py-2">
                    Nenhuma venda no ciclo atual.
                  </p>
                )}
              </div>
            </div>

            <div
              className={`p-5 rounded-2xl border ${card}`}
            >
              <p className="text-xs font-semibold uppercase tracking-wider opacity-60">
                👤 Fechamentos por descrição
              </p>

              <div className="mt-4 space-y-3">
                {resumoAtual.porDescricao.map(
                  ([chave, dados]) => (
                    <ResumoDescricao
                      key={chave}
                      dados={dados}
                    />
                  )
                )}

                {Object.keys(
                  resumoAtual.semDescricao
                    .produtos
                ).length > 0 && (
                  <ResumoDescricao
                    dados={
                      resumoAtual.semDescricao
                    }
                  />
                )}

                {!resumoAtual.porDescricao
                  .length &&
                  !Object.keys(
                    resumoAtual.semDescricao
                      .produtos
                  ).length && (
                    <p className="text-xs opacity-50 py-2">
                      Nenhuma descrição registrada.
                    </p>
                  )}
              </div>
            </div>

            <div
              className={`p-5 rounded-2xl border ${card}`}
            >
              <p className="text-xs font-semibold uppercase tracking-wider opacity-60">
                📦 Produtos vendidos
              </p>

              <div className="mt-4 divide-y divide-zinc-800/50 text-sm">
                {Object.entries(
                  resumoAtual.mapa
                ).map(([nome, d]) => (
                  <div
                    key={nome}
                    className="flex justify-between py-2 first:pt-0 last:pb-0 items-center"
                  >
                    <span className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-zinc-800 text-xs font-bold text-[#D6FF57]">
                        {d.qtd}x
                      </span>

                      <span>{nome}</span>
                    </span>

                    <b className="font-semibold">
                      {dinheiro(d.total)}
                    </b>
                  </div>
                ))}

                {!Object.keys(
                  resumoAtual.mapa
                ).length && (
                  <p className="text-xs opacity-50 py-2">
                    Nenhuma venda.
                  </p>
                )}
              </div>
            </div>
          </section>
        )}

        {tab === "fechamentos" && (
          <section className="max-w-[800px] mx-auto">
            <div className="flex justify-between items-end gap-3">
              <div>
                <h1 className="text-3xl font-bold">
                  Fechamentos
                </h1>

                <p className="text-xs opacity-60">
                  Histórico dos ciclos encerrados
                </p>
              </div>

              <button
                onClick={fetchFechamentos}
                className="px-4 py-2 rounded-xl border text-xs"
              >
                <span className="material-symbols-rounded align-middle text-[18px]">
                  refresh
                </span>
                Atualizar
              </button>
            </div>

            <div className="mt-5 space-y-3">
              {fechamentos.map((f, index) => {
                const aberto =
                  fechamentoAberto === f.id;

                const resumoSalvo =
                  normalizarResumo(
                    f.dados ?? f.resumo
                  );

                const total = Number(
                  f.total ??
                    resumoSalvo?.totalGeral ??
                    0
                );

                return (
                  <div
                    key={f.id}
                    className={`rounded-2xl border overflow-hidden ${card}`}
                  >
                    <button
                      onClick={() =>
                        setFechamentoAberto(
                          aberto
                            ? null
                            : f.id
                        )
                      }
                      className="w-full p-4 flex items-center justify-between text-left"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#D6FF57] text-black flex items-center justify-center font-bold">
                          #
                          {numeroFechamento(
                            f,
                            index
                          )}
                        </div>

                        <div>
                          <p className="font-bold">
                            #
                            {numeroFechamento(
                              f,
                              index
                            )}{" "}
                            {formatarDataFechamento(
                              f.created_at
                            )}
                          </p>

                          <p className="text-xs opacity-50">
                            {formatarData(
                              f.created_at
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <b>
                          {dinheiro(total)}
                        </b>

                        <span className="material-symbols-rounded">
                          {aberto
                            ? "expand_less"
                            : "expand_more"}
                        </span>
                      </div>
                    </button>

                    {aberto && (
                      <div className="border-t border-zinc-800 p-4">
                        <RenderResumoSalvo
                          resumo={resumoSalvo}
                          card={card}
                        />

                        <button
                          disabled={
                            apagandoFechamento ===
                            f.id
                          }
                          onClick={() =>
                            deletarFechamento(
                              f.id
                            )
                          }
                          className="mt-5 w-full py-3 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 font-semibold disabled:opacity-50"
                        >
                          <span className="material-symbols-rounded align-middle mr-1">
                            delete
                          </span>

                          {apagandoFechamento ===
                          f.id
                            ? "Apagando..."
                            : "Apagar relatório"}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}

              {!fechamentos.length && (
                <div
                  className={`p-8 rounded-2xl border text-center ${card}`}
                >
                  <span className="material-symbols-rounded text-4xl opacity-30">
                    receipt_long
                  </span>

                  <p className="mt-2 font-semibold">
                    Nenhum fechamento
                  </p>

                  <p className="text-xs opacity-50 mt-1">
                    Faça o primeiro fechamento
                    pelo Dashboard.
                  </p>
                </div>
              )}
            </div>
          </section>
        )}

        {tab === "log" && (
          <section className="max-w-[800px] mx-auto">
            <h1 className="text-3xl font-bold">
              Log
            </h1>

            <p className="text-xs opacity-60">
              Todas as vendas feitas
            </p>

            <div
              className={`mt-4 p-3 rounded-2xl border ${card}`}
            >
              <div className="flex items-center gap-2">
                <span className="material-symbols-rounded opacity-50">
                  search
                </span>

                <input
                  value={logBusca}
                  onChange={(e) =>
                    setLogBusca(
                      e.target.value
                    )
                  }
                  placeholder="Pesquisar data, hora, descrição, pagamento ou produto..."
                  className="flex-1 bg-transparent outline-none text-sm"
                />
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {vendasLogFiltradas.map((v) => {
                const itens = parseItens(
                  v.itens
                );

                return (
                  <div
                    key={v.id}
                    className={`p-4 rounded-2xl border ${card}`}
                  >
                    <div className="flex justify-between gap-3">
                      <div>
                        <b>
                          Venda #{v.id}
                        </b>

                        <p className="text-[11px] opacity-50 mt-1">
                          {formatarData(
                            v.created_at
                          )}
                        </p>
                      </div>

                      <b>
                        {dinheiro(
                          Number(v.total)
                        )}
                      </b>
                    </div>

                    <div className="mt-3 space-y-1">
                      {itens.map(
                        (item, i) => (
                          <div
                            key={i}
                            className="flex justify-between text-xs"
                          >
                            <span>
                              {item.cartQtd}x{" "}
                              {item.nome}
                            </span>

                            <span className="opacity-60">
                              {dinheiro(
                                (parseFloat(
                                  item.preco
                                ) || 0) *
                                  item.cartQtd
                              )}
                            </span>
                          </div>
                        )
                      )}
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="text-[10px] px-2 py-1 rounded-full bg-[#D6FF57] text-black uppercase">
                        {v.pagamento}
                      </span>

                      {v.fechamento_id && (
                        <span className="text-[10px] px-2 py-1 rounded-full bg-zinc-800">
                          Fechamento #
                          {v.fechamento_id}
                        </span>
                      )}
                    </div>

                    {v.descricao && (
                      <div className="mt-2 p-2 rounded-xl bg-zinc-800 text-xs">
                        📝 {v.descricao}
                      </div>
                    )}

                    <button
                      onClick={() =>
                        deletarVenda(v.id)
                      }
                      className="mt-3 w-full py-2 rounded-xl bg-red-500/10 text-red-400 text-xs"
                    >
                      Apagar venda
                    </button>
                  </div>
                );
              })}

              {!vendasLogFiltradas.length && (
                <p className="text-center text-xs opacity-50 py-8">
                  Nenhuma venda encontrada.
                </p>
              )}
            </div>
          </section>
        )}

        {tab === "settings" && (
          <section className="max-w-[520px] mx-auto">
            <h1 className="text-3xl font-bold">
              Config
            </h1>

            <div
              className={`mt-6 p-6 rounded-2xl border space-y-6 ${card}`}
            >
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-2">
                  <span className="material-symbols-rounded">
                    dark_mode
                  </span>
                  Tema
                </span>

                <button
                  onClick={() =>
                    setDark(!dark)
                  }
                  className="px-4 py-2 rounded-full border"
                >
                  {dark ? "Dark" : "Light"}
                </button>
              </div>

              <button
                onClick={() => {
                  sessionStorage.removeItem(
                    "freezer_logged"
                  );

                  setLogged(false);
                }}
                className="w-full py-3 rounded-xl border border-red-500/30 text-red-500"
              >
                Sair
              </button>
            </div>
          </section>
        )}
      </main>

      {cart.length > 0 && (
        <div
          className={`fixed bottom-[108px] left-1/2 -translate-x-1/2 w-[calc(100%-24px)] max-w-[460px] rounded-[24px] p-4 shadow-2xl z-40 border ${card}`}
        >
          <div className="flex justify-between items-center mb-3">
            <b>
              <span className="material-symbols-rounded align-middle mr-1">
                shopping_cart
              </span>

              {totalQtdCarrinho} itens
            </b>

            <b>
              {dinheiro(totalCarrinho)}
            </b>
          </div>

          <div className="max-h-[140px] overflow-auto space-y-2 mb-3">
            {cart.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-2 bg-zinc-800 rounded-xl p-2 text-white"
              >
                <img
                  src={item.imagem}
                  className="w-8 h-8 bg-white rounded object-contain"
                />

                <span className="flex-1 text-xs truncate">
                  {item.nome}
                </span>

                <button
                  onClick={() =>
                    setCart((c) =>
                      c.map((i) =>
                        i.id === item.id
                          ? {
                              ...i,
                              cartQtd:
                                Math.max(
                                  1,
                                  i.cartQtd -
                                    1
                                ),
                            }
                          : i
                      )
                    )
                  }
                  className="w-7 h-7 rounded-full bg-zinc-700"
                >
                  -
                </button>

                <span className="w-5 text-center text-sm">
                  {item.cartQtd}
                </span>

                <button
                  onClick={() =>
                    addToCart(
                      produtos.find(
                        (p) =>
                          p.id ===
                          item.id
                      ) || item
                    )
                  }
                  className="w-7 h-7 rounded-full bg-zinc-700"
                >
                  +
                </button>

                <button
                  onClick={() =>
                    setCart((c) =>
                      c.filter(
                        (i) =>
                          i.id !== item.id
                      )
                    )
                  }
                  className="w-7 h-7 rounded-full bg-red-500/20 text-red-400"
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          <button
            onClick={() =>
              setShowCheckout(true)
            }
            className="w-full py-3 rounded-xl bg-[#D6FF57] text-black font-bold"
          >
            Finalizar Venda
          </button>
        </div>
      )}

      {showCheckout && (
        <div className="fixed inset-0 bg-black/70 z-[100] flex items-end md:items-center justify-center p-4">
          <div
            className={`w-full max-w-[460px] rounded-[24px] p-6 space-y-4 border ${card}`}
          >
            <div className="flex justify-between">
              <h2 className="font-bold text-xl">
                Finalizar
              </h2>

              <button
                onClick={() =>
                  setShowCheckout(false)
                }
              >
                <span className="material-symbols-rounded">
                  close
                </span>
              </button>
            </div>

            <p className="text-sm opacity-60">
              {totalQtdCarrinho} itens •{" "}
              {dinheiro(totalCarrinho)}
            </p>

            <div className="grid grid-cols-4 gap-2">
              {[
                "pix",
                "dinheiro",
                "cartao",
                "vale",
              ].map((m) => (
                <button
                  key={m}
                  onClick={() =>
                    setPagamento(m)
                  }
                  className={`p-3 rounded-xl border text-xs uppercase ${
                    pagamento === m
                      ? "bg-[#D6FF57] text-black border-[#D6FF57]"
                      : "border-zinc-700"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>

            <textarea
              placeholder="Descrição (cliente, fiado...)"
              value={descricao}
              onChange={(e) =>
                setDescricao(
                  e.target.value
                )
              }
              className="w-full p-3 rounded-xl bg-transparent border border-zinc-700 h-20"
            />

            <button
              onClick={finalizarVenda}
              className="w-full py-4 rounded-xl bg-[#D6FF57] text-black font-bold"
            >
              Confirmar{" "}
              {dinheiro(totalCarrinho)}
            </button>
          </div>
        </div>
      )}

      {showConfirmFechamento && (
  <div className="fixed inset-0 bg-black/75 z-[150] flex items-center justify-center p-4">
    <div className={`w-full max-w-[430px] rounded-[24px] p-6 border ${card}`}>
      <div className="w-14 h-14 rounded-full bg-[#D6FF57] text-black flex items-center justify-center mx-auto">
        <span className="material-symbols-rounded text-3xl">task_alt</span>
      </div>

      <h2 className="text-xl font-bold text-center mt-4">Fazer fechamento?</h2>

      <p className="text-sm opacity-60 text-center mt-2">
        O ciclo atual será encerrado e um novo ciclo será iniciado.
      </p>

      <div className="mt-4 p-4 rounded-2xl bg-zinc-800 text-white">
        <div className="flex justify-between text-sm">
          <span>Vendas</span>
          <b>{vendas.length}</b>
        </div>
        <div className="flex justify-between mt-2">
          <span>Total</span>
          <b className="text-[#D6FF57]">{dinheiro(resumoAtual.totalGeral)}</b>
        </div>
      </div>

      <p className="text-xs opacity-50 text-center mt-4">
        As vendas serão encerradas no ciclo atual e continuarão disponíveis no Log e no fechamento histórico.
      </p>

      <div className="grid grid-cols-2 gap-3 mt-5">
        <button
          disabled={fazendoFechamento}
          onClick={() => setShowConfirmFechamento(false)}
          className="py-3 rounded-xl border border-zinc-700"
        >
          Cancelar
        </button>

        <button
  disabled={fazendoFechamento}
  onClick={async () => {
    setFazendoFechamento(true);
    try {
      // Fecha e já apaga as vendas no Turso
      const res = await fetch("/api/fechamentos", { method: "POST" });
      if (!res.ok) throw new Error("Erro ao fechar");

      // Garante que limpou (mesmo que o fechamentos já limpe)
      await fetch("/api/vendas", { method: "DELETE" });

      setVendas([]);
      setShowConfirmFechamento(false);
      window.location.href = "/fechamentos";
    } catch (e: any) {
      alert(e.message);
    } finally {
      setFazendoFechamento(false);
    }
  }}
>
  {fazendoFechamento? "Fechando..." : "Confirmar"}
</button>
      </div>
    </div>
  </div>
)}

      <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[calc(100%-20px)] max-w-[520px] z-50">
        <div className="grid grid-cols-5 items-center rounded-[28px] p-2 bg-[#151517] border border-zinc-800 shadow-2xl overflow-hidden">
          {NAV_TABS.map((nav) => {
            const ativo =
              tab === nav.id;

            return (
              <button
                key={nav.id}
                onClick={() =>
                  setTab(nav.id)
                }
                className={`relative h-[56px] w-full flex items-center justify-center rounded-[22px] transition-all ${
                  ativo
                    ? "bg-[#D6FF57] text-black"
                    : "text-white opacity-50"
                }`}
              >
                <span className="material-symbols-rounded text-[26px]">
                  {nav.icon}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

function Toast({
  text,
}: {
  text: string;
}) {
  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 bg-zinc-900 text-white px-5 py-3 rounded-full text-sm z-[300] border border-zinc-700 max-w-[90%] text-center">
      {text}
    </div>
  );
}

function ResumoPagamento({
  nome,
  dados,
}: {
  nome: string;
  dados: PagamentoResumo;
}) {
  return (
    <div className="rounded-2xl bg-zinc-800 text-white overflow-hidden">
      <div className="p-3 flex justify-between border-b border-zinc-700">
        <b className="uppercase text-sm">
          {nome}
        </b>

        <b className="text-[#D6FF57]">
          {dinheiro(dados.total)}
        </b>
      </div>

      <div className="p-3 space-y-2">
        {Object.entries(
          dados.produtos
        ).map(([n, p]) => (
          <div
            key={n}
            className="flex justify-between text-xs"
          >
            <span>
              <b className="text-[#D6FF57]">
                {p.qtd}x
              </b>{" "}
              {n}
            </span>

            <span className="opacity-70">
              {dinheiro(p.total)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ResumoDescricao({
  dados,
}: {
  dados: DescricaoResumo;
}) {
  return (
    <div className="rounded-2xl bg-zinc-800 text-white overflow-hidden">
      <div className="p-3 flex justify-between border-b border-zinc-700">
        <b>{dados.nome}</b>

        <b className="text-[#D6FF57]">
          {dinheiro(dados.total)}
        </b>
      </div>

      <div className="p-3 space-y-2">
        {Object.entries(
          dados.produtos
        ).map(([n, p]) => (
          <div
            key={n}
            className="flex justify-between text-xs"
          >
            <span>
              <b className="text-[#D6FF57]">
                {p.qtd}x
              </b>{" "}
              {n}
            </span>

            <span className="opacity-70">
              {dinheiro(p.total)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function RenderResumoSalvo({
  resumo,
  card,
}: {
  resumo: Resumo | null;
  card: string;
}) {
  if (!resumo) {
    return (
      <div
        className={`p-4 rounded-xl border ${card}`}
      >
        <p className="text-xs opacity-50">
          Este relatório não possui resumo
          detalhado salvo. Verifique se a API
          /api/fechamentos está salvando o
          campo dados ou resumo.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div
        className={`p-4 rounded-2xl border ${card}`}
      >
        <p className="text-xs opacity-50">
          Total do fechamento
        </p>

        <p className="text-3xl font-bold">
          {dinheiro(
            resumo.totalGeral
          )}
        </p>
      </div>

      {Object.keys(
        resumo.porPagamento
      ).length > 0 && (
        <div>
          <p className="font-bold mb-2">
            💳 Formas de pagamento
          </p>

          <div className="space-y-2">
            {Object.entries(
              resumo.porPagamento
            ).map(([nome, dados]) => (
              <ResumoPagamento
                key={nome}
                nome={nome}
                dados={dados}
              />
            ))}
          </div>
        </div>
      )}

      {resumo.porDescricao.length > 0 && (
        <div>
          <p className="font-bold mb-2">
            👤 Por descrição
          </p>

          <div className="space-y-2">
            {resumo.porDescricao.map(
              ([chave, dados]) => (
                <ResumoDescricao
                  key={chave}
                  dados={dados}
                />
              )
            )}
          </div>
        </div>
      )}

      {Object.keys(
        resumo.semDescricao.produtos
      ).length > 0 && (
        <div>
          <p className="font-bold mb-2">
            📝 Sem descrição
          </p>

          <ResumoDescricao
            dados={resumo.semDescricao}
          />
        </div>
      )}

      <div>
        <p className="font-bold mb-2">
          📦 Produtos vendidos
        </p>

        <div
          className={`p-4 rounded-2xl border ${card} space-y-2`}
        >
          {Object.entries(
            resumo.mapa
          ).map(([nome, dados]) => (
            <div
              key={nome}
              className="flex justify-between text-sm"
            >
              <span>
                {dados.qtd}x {nome}
              </span>

              <b>
                {dinheiro(dados.total)}
              </b>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AddProduto({
  fetchProdutos,
  showToast,
}: {
  fetchProdutos: () => Promise<void>;
  showToast: (message: string) => void;
}) {
  const [form, setForm] = useState({
    nome: "",
    preco: "",
    qtd: "",
    imagem: "",
  });

  const [loading, setLoading] =
    useState(false);

  async function save() {
    if (!form.nome || !form.preco) {
      return showToast("Nome e preço");
    }

    if (!form.imagem) {
      return showToast("Escolha imagem");
    }

    setLoading(true);

    try {
      const r = await fetch(
        "/api/produtos",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            nome: form.nome,
            preco: form.preco,
            qtd: parseInt(
              form.qtd || "0"
            ),
            imagem: form.imagem,
          }),
        }
      );

      const data = await r.json();

      if (!r.ok) {
        throw new Error(
          data.error || "Erro banco"
        );
      }

      setForm({
        nome: "",
        preco: "",
        qtd: "",
        imagem: "",
      });

      await fetchProdutos();

      showToast(
        data.qtd
          ? `Estoque somado! Agora ${data.qtd} un`
          : "Produto salvo!"
      );
    } catch (e: any) {
      showToast(
        e?.message ||
          "Erro ao salvar"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-6 p-6 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-4">
      <h3 className="font-bold">
        ➕ Adicionar novo produto
      </h3>

      <div className="grid grid-cols-4 gap-2">
        {GALERIA.map(
          ([nome, url]) => (
            <button
              key={nome}
              onClick={() =>
                setForm({
                  ...form,
                  imagem: url,
                  nome:
                    form.nome ||
                    nome,
                })
              }
              className={`h-20 rounded-xl bg-white p-1 border-2 ${
                form.imagem === url
                  ? "border-[#D6FF57]"
                  : "border-transparent"
              }`}
            >
              <img
                src={url}
                className="w-full h-full object-contain"
              />
            </button>
          )
        )}
      </div>

      {form.imagem && (
        <div className="flex gap-3 items-center p-2 bg-zinc-800 rounded-xl text-white">
          <img
            src={form.imagem}
            className="w-12 h-12 bg-white rounded p-1 object-contain"
          />

          <span className="text-sm">
            {form.nome}
          </span>
        </div>
      )}

      <input
        placeholder="Nome"
        value={form.nome}
        onChange={(e) =>
          setForm({
            ...form,
            nome: e.target.value,
          })
        }
        className="w-full p-3 rounded-xl bg-transparent border border-zinc-700 text-white"
      />

      <div className="grid grid-cols-2 gap-3">
        <input
          placeholder="Preço"
          type="number"
          value={form.preco}
          onChange={(e) =>
            setForm({
              ...form,
              preco: e.target.value,
            })
          }
          className="p-3 rounded-xl bg-transparent border border-zinc-700 text-white"
        />

        <input
          placeholder="Qtd"
          type="number"
          value={form.qtd}
          onChange={(e) =>
            setForm({
              ...form,
              qtd: e.target.value,
            })
          }
          className="p-3 rounded-xl bg-transparent border border-zinc-700 text-white"
        />
      </div>

      <button
        onClick={save}
        disabled={loading}
        className="w-full py-3 rounded-xl bg-[#D6FF57] text-black font-bold disabled:opacity-50"
      >
        {loading
          ? "Salvando..."
          : "Salvar Produto"}
      </button>
    </div>
  );
}