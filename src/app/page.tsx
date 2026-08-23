"use client";

import { useState, useEffect, useRef } from "react";

type Tab =
  | "home"
  | "pdv"
  | "add"
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

type CartItem = Produto & {
  cartQtd: number;
};

type Venda = {
  id: number;
  itens: string;
  total: number;
  pagamento: string;
  descricao: string;
  created_at: string;
};

type ProdutoResumo = {
  qtd: number;
  total: number;
};

type PagamentoResumo = {
  total: number;
  produtos: Record<string, ProdutoResumo>;
};

type DescricaoResumo = {
  nome: string;
  total: number;
  produtos: Record<string, ProdutoResumo>;
};

type Fechamento = {
  id: number;
  numero: number;
  created_at: string;
  total: number;
  quantidade_vendas: number;
  quantidade_itens: number;
};

type FechamentoDetalhe = Fechamento & {
  venda_ids: number[];
  resumo: {
    fechamentoGeral: {
      total: number;
      quantidadeVendas: number;
      quantidadeItens: number;
    };
    porPagamento: Record<string, PagamentoResumo>;
    porDescricao: DescricaoResumo[];
    semDescricao: DescricaoResumo;
    produtos: Record<string, ProdutoResumo>;
  };
};

const TABS = [
  {
    id: "home" as Tab,
    icon: "home",
    label: "Home",
  },
  {
    id: "pdv" as Tab,
    icon: "inventory_2",
    label: "PDV",
  },
  {
    id: "add" as Tab,
    icon: "add_box",
    label: "Adicionar",
  },
  {
    id: "dash" as Tab,
    icon: "monitoring",
    label: "Dash",
  },
  {
    id: "fechamentos" as Tab,
    icon: "receipt_long",
    label: "Fechamentos",
  },
  {
    id: "log" as Tab,
    icon: "history",
    label: "Log",
  },
  {
    id: "settings" as Tab,
    icon: "settings",
    label: "Config",
  },
];

const GALERIA = [
  {
    nome: "Coca-Cola 2L",
    url: "/img/coca2lt.png",
  },
  {
    nome: "Coca Lata 350ml",
    url: "/img/cocalata.png",
  },
  {
    nome: "Coca Zero Lata 350ml",
    url: "/img/cocalatazero.png",
  },
  {
    nome: "Fanta Laranja 2L",
    url: "/img/fanta2lt.png",
  },
  {
    nome: "Fanta Lata",
    url: "/img/fantalata.png",
  },
  {
    nome: "Guaraná 2L",
    url: "/img/guarana2lt.png",
  },
  {
    nome: "Guaraná Lata",
    url: "/img/guaranalata.png",
  },
  {
    nome: "Guaraná Lata Zero",
    url: "/img/guaranalatazero.png",
  },
  {
    nome: "Água 500ml",
    url: "/img/agua.png",
  },
];

export default function App() {
  const [logged, setLogged] =
    useState(false);

  const [loginForm, setLoginForm] =
    useState({
      user: "",
      pass: "",
    });

  const [tab, setTab] =
    useState<Tab>("home");

  const [dark, setDark] =
    useState(true);

  const [produtos, setProdutos] =
    useState<Produto[]>([]);

  const [cart, setCart] =
    useState<CartItem[]>([]);

  const [vendas, setVendas] =
    useState<Venda[]>([]);

  const [pagamento, setPagamento] =
    useState("pix");

  const [descricao, setDescricao] =
    useState("");

  const [showCheckout, setShowCheckout] =
    useState(false);

  const [toast, setToast] =
    useState<string | null>(null);

  const [savedPass, setSavedPass] =
    useState("pdvadmin123");

  const [newPass, setNewPass] =
    useState("");

  const [
    fechamentos,
    setFechamentos,
  ] = useState<Fechamento[]>([]);

  const [
    fechamentoAberto,
    setFechamentoAberto,
  ] = useState<number | null>(null);

  const [
    fechamentoDetalhe,
    setFechamentoDetalhe,
  ] =
    useState<FechamentoDetalhe | null>(
      null
    );

  const [
    loadingFechamento,
    setLoadingFechamento,
  ] = useState(false);

  const [
    fazendoFechamento,
    setFazendoFechamento,
  ] = useState(false);

  const [
    pesquisaLog,
    setPesquisaLog,
  ] = useState("");

  const afkRef =
    useRef<any>(null);

  /*
   * ==========================================================
   * TOAST
   * ==========================================================
   */

  const showToast = (m: string) => {
    setToast(m);

    setTimeout(() => {
      setToast(null);
    }, 3000);
  };

  /*
   * ==========================================================
   * LOGIN / TEMA
   * ==========================================================
   */

  useEffect(() => {
    setLogged(
      sessionStorage.getItem(
        "freezer_logged"
      ) === "true"
    );

    setSavedPass(
      localStorage.getItem(
        "freezer_pass"
      ) || "pdvadmin123"
    );

    if (
      localStorage.getItem(
        "theme"
      ) === "light"
    ) {
      setDark(false);
    }
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle(
      "light",
      !dark
    );

    localStorage.setItem(
      "theme",
      dark ? "dark" : "light"
    );
  }, [dark]);

  /*
   * ==========================================================
   * AUTO LOGOUT
   * ==========================================================
   */

  useEffect(() => {
    if (!logged) return;

    const reset = () => {
      clearTimeout(
        afkRef.current
      );

      afkRef.current =
        setTimeout(() => {
          sessionStorage.removeItem(
            "freezer_logged"
          );

          setLogged(false);
        }, 5 * 60 * 1000);
    };

    [
      "mousemove",
      "keydown",
      "touchstart",
      "click",
    ].forEach((e) =>
      window.addEventListener(
        e,
        reset
      )
    );

    reset();

    return () => {
      [
        "mousemove",
        "keydown",
        "touchstart",
        "click",
      ].forEach((e) =>
        window.removeEventListener(
          e,
          reset
        )
      );

      clearTimeout(
        afkRef.current
      );
    };
  }, [logged]);

  /*
   * ==========================================================
   * PRODUTOS
   * ==========================================================
   */

  const fetchProdutos = () =>
    fetch("/api/produtos")
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d)) {
          setProdutos(d);
        }
      })
      .catch(() => {
        showToast(
          "Erro ao carregar produtos"
        );
      });

  /*
   * ==========================================================
   * VENDAS
   * ==========================================================
   */

  const fetchVendas = () =>
    fetch("/api/vendas")
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d)) {
          setVendas(d);
        }
      })
      .catch(() => {
        showToast(
          "Erro ao carregar vendas"
        );
      });

  /*
   * ==========================================================
   * FECHAMENTOS
   * ==========================================================
   */

  const fetchFechamentos =
    async () => {
      try {
        const r = await fetch(
          "/api/fechamentos"
        );

        const data =
          await r.json();

        if (!r.ok) {
          throw new Error(
            data.error ||
              "Erro ao buscar fechamentos"
          );
        }

        if (Array.isArray(data)) {
          setFechamentos(data);
        }
      } catch (e: any) {
        showToast(
          e.message ||
            "Erro ao carregar fechamentos"
        );
      }
    };

  /*
   * ==========================================================
   * ABRIR FECHAMENTO
   * ==========================================================
   */

  const abrirFechamento =
    async (id: number) => {
      if (
        fechamentoAberto === id
      ) {
        setFechamentoAberto(null);
        setFechamentoDetalhe(
          null
        );
        return;
      }

      setFechamentoAberto(id);
      setLoadingFechamento(true);

      try {
        const r = await fetch(
          "/api/fechamentos?id=" +
            id
        );

        const data =
          await r.json();

        if (!r.ok) {
          throw new Error(
            data.error ||
              "Erro ao abrir fechamento"
          );
        }

        setFechamentoDetalhe(
          data
        );
      } catch (e: any) {
        showToast(
          e.message ||
            "Erro ao abrir fechamento"
        );

        setFechamentoAberto(null);
      } finally {
        setLoadingFechamento(false);
      }
    };

  /*
   * ==========================================================
   * FAZER FECHAMENTO
   * ==========================================================
   */

  const fazerFechamento =
    async () => {
      if (vendas.length === 0) {
        showToast(
          "Nenhuma venda registrada."
        );

        return;
      }

      if (
        !confirm(
          "Fazer um novo fechamento com as vendas ainda não fechadas?"
        )
      ) {
        return;
      }

      setFazendoFechamento(true);

      try {
        const r = await fetch(
          "/api/fechamentos",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
          }
        );

        const data =
          await r.json();

        if (!r.ok) {
          throw new Error(
            data.error ||
              "Erro ao fazer fechamento"
          );
        }

        const numero =
          data.fechamento?.numero;

        showToast(
          numero
            ? `Fechamento #${String(
                numero
              ).padStart(
                3,
                "0"
              )} realizado!`
            : "Fechamento realizado!"
        );

        await fetchFechamentos();

        /*
         * Vai para a aba de fechamentos
         */

        setTab("fechamentos");

        /*
         * Abre automaticamente o fechamento
         */

        if (
          data.fechamento?.id
        ) {
          await abrirFechamento(
            Number(
              data.fechamento.id
            )
          );
        }
      } catch (e: any) {
        showToast(
          e.message ||
            "Erro ao fazer fechamento"
        );
      } finally {
        setFazendoFechamento(false);
      }
    };

  /*
   * ==========================================================
   * CARREGAMENTO
   * ==========================================================
   */

  useEffect(() => {
    if (!logged) return;

    fetchProdutos();
    fetchVendas();
    fetchFechamentos();
  }, [logged]);

  useEffect(() => {
    if (!logged) return;

    if (
      tab === "fechamentos"
    ) {
      fetchFechamentos();
    }

    if (
      tab === "log" ||
      tab === "dash"
    ) {
      fetchVendas();
    }
  }, [tab, logged]);

  /*
   * ==========================================================
   * LOGIN
   * ==========================================================
   */

  function doLogin() {
    if (
      loginForm.user ===
        "freezer" &&
      loginForm.pass ===
        savedPass
    ) {
      setLogged(true);

      sessionStorage.setItem(
        "freezer_logged",
        "true"
      );

      setLoginForm({
        user: "",
        pass: "",
      });
    } else {
      showToast(
        "Usuário ou senha inválidos"
      );
    }
  }

  /*
   * ==========================================================
   * CARRINHO
   * ==========================================================
   */

  function addToCart(
    p: Produto
  ) {
    if (p.qtd <= 0) {
      return showToast(
        "Sem estoque"
      );
    }

    setCart((prev) => {
      const ex =
        prev.find(
          (c) =>
            c.id === p.id
        );

      if (ex) {
        if (
          ex.cartQtd >=
          p.qtd
        ) {
          showToast(
            "Estoque máximo: " +
              p.qtd
          );

          return prev;
        }

        return prev.map(
          (c) =>
            c.id === p.id
              ? {
                  ...c,
                  cartQtd:
                    c.cartQtd +
                    1,
                }
              : c
        );
      }

      return [
        ...prev,
        {
          ...p,
          cartQtd: 1,
        },
      ];
    });
  }

  /*
   * ==========================================================
   * FINALIZAR VENDA
   * ==========================================================
   */

  async function finalizarVenda() {
    if (cart.length === 0) {
      return showToast(
        "Carrinho vazio"
      );
    }

    const total =
      cart.reduce(
        (s, i) =>
          s +
          parseFloat(
            i.preco
          ) *
            i.cartQtd,
        0
      );

    try {
      const r =
        await fetch(
          "/api/vendas",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              itens: cart,
              total,
              pagamento,
              descricao,
            }),
          }
        );

      const data =
        await r.json();

      if (!r.ok) {
        throw new Error(
          data.error ||
            "Erro ao salvar venda"
        );
      }

      setCart([]);

      setDescricao("");

      setShowCheckout(false);

      await fetchProdutos();

      await fetchVendas();

      showToast(
        "Venda salva!"
      );

      setTab("dash");
    } catch (e: any) {
      showToast(
        e.message ||
          "Erro ao salvar venda"
      );
    }
  }

  /*
   * ==========================================================
   * DELETAR PRODUTO
   * ==========================================================
   */

  async function deletarProduto(
    id: number
  ) {
    if (
      !confirm(
        "Remover do freezer?"
      )
    ) {
      return;
    }

    await fetch(
      "/api/produtos?id=" +
        id,
      {
        method: "DELETE",
      }
    );

    fetchProdutos();
  }

  /*
   * ==========================================================
   * RESUMO DO DASH
   * ==========================================================
   */

  const resumoFechamento =
    () => {
      const mapa: Record<
        string,
        ProdutoResumo
      > = {};

      const porPagamento: Record<
        string,
        PagamentoResumo
      > = {};

      const porDescricao: Record<
        string,
        DescricaoResumo
      > = {};

      const semDescricao:
        DescricaoResumo = {
        nome: "Sem descrição",
        total: 0,
        produtos: {},
      };

      vendas.forEach((v) => {
        let itens: CartItem[] =
          [];

        try {
          itens = JSON.parse(
            v.itens
          );
        } catch {
          itens = [];
        }

        const pagamentoAtual =
          String(
            v.pagamento ||
              "outro"
          )
            .trim()
            .toLowerCase();

        if (
          !porPagamento[
            pagamentoAtual
          ]
        ) {
          porPagamento[
            pagamentoAtual
          ] = {
            total: 0,
            produtos: {},
          };
        }

        porPagamento[
          pagamentoAtual
        ].total += Number(
          v.total
        );

        const descricaoOriginal =
          String(
            v.descricao ||
              ""
          ).trim();

        const chaveDescricao =
          descricaoOriginal.toLocaleLowerCase(
            "pt-BR"
          );

        const temDescricao =
          chaveDescricao.length >
          0;

        let grupoDescricao:
          | DescricaoResumo
          | null = null;

        if (temDescricao) {
          if (
            !porDescricao[
              chaveDescricao
            ]
          ) {
            porDescricao[
              chaveDescricao
            ] = {
              nome:
                descricaoOriginal,
              total: 0,
              produtos: {},
            };
          }

          grupoDescricao =
            porDescricao[
              chaveDescricao
            ];

          grupoDescricao.total +=
            Number(v.total);
        } else {
          grupoDescricao =
            semDescricao;

          semDescricao.total +=
            Number(v.total);
        }

        itens.forEach(
          (it) => {
            const nome =
              it.nome;

            const qtd =
              Number(
                it.cartQtd
              ) || 0;

            const preco =
              parseFloat(
                it.preco
              ) || 0;

            const valor =
              preco * qtd;

            if (!mapa[nome]) {
              mapa[nome] = {
                qtd: 0,
                total: 0,
              };
            }

            mapa[nome].qtd +=
              qtd;

            mapa[nome].total +=
              valor;

            if (
              !porPagamento[
                pagamentoAtual
              ].produtos[nome]
            ) {
              porPagamento[
                pagamentoAtual
              ].produtos[
                nome
              ] = {
                qtd: 0,
                total: 0,
              };
            }

            porPagamento[
              pagamentoAtual
            ].produtos[
              nome
            ].qtd += qtd;

            porPagamento[
              pagamentoAtual
            ].produtos[
              nome
            ].total += valor;

            if (
              !grupoDescricao
                .produtos[nome]
            ) {
              grupoDescricao.produtos[
                nome
              ] = {
                qtd: 0,
                total: 0,
              };
            }

            grupoDescricao.produtos[
              nome
            ].qtd += qtd;

            grupoDescricao.produtos[
              nome
            ].total += valor;
          }
        );
      });

      const descricoesOrdenadas =
        Object.entries(
          porDescricao
        ).sort(
          (a, b) =>
            a[1].nome.localeCompare(
              b[1].nome,
              "pt-BR",
              {
                sensitivity:
                  "base",
              }
            )
        );

      return {
        mapa,
        porPagamento,
        porDescricao:
          descricoesOrdenadas,
        semDescricao,
        totalGeral:
          vendas.reduce(
            (s, v) =>
              s +
              Number(
                v.total
              ),
            0
          ),
      };
    };

  /*
   * ==========================================================
   * FORMATAÇÃO
   * ==========================================================
   */

  function moeda(
    valor: number
  ) {
    return (
      "R$ " +
      Number(valor || 0).toFixed(
        2
      )
    );
  }

  function dataHora(
    data: string
  ) {
    return new Date(
      data
    ).toLocaleString(
      "pt-BR"
    );
  }

  function dataFechamento(
    data: string
  ) {
    return new Date(
      data
    ).toLocaleDateString(
      "pt-BR",
      {
        day: "2-digit",
        month: "long",
        year: "numeric",
      }
    );
  }

  /*
   * ==========================================================
   * ÍCONE PAGAMENTO
   * ==========================================================
   */

  function pagamentoIcon(
    pagamento: string
  ) {
    if (
      pagamento ===
      "pix"
    )
      return "qr_code";

    if (
      pagamento ===
      "dinheiro"
    )
      return "payments";

    if (
      pagamento ===
      "cartao"
    )
      return "credit_card";

    return "receipt_long";
  }

  /*
   * ==========================================================
   * LOG - PESQUISA
   * ==========================================================
   */

  const vendasFiltradas =
    vendas
      .slice()
      .sort(
        (a, b) =>
          new Date(
            b.created_at
          ).getTime() -
          new Date(
            a.created_at
          ).getTime()
      )
      .filter((v) => {
        const busca =
          pesquisaLog
            .trim()
            .toLocaleLowerCase(
              "pt-BR"
            );

        if (!busca) {
          return true;
        }

        let itens: CartItem[] =
          [];

        try {
          itens =
            JSON.parse(
              v.itens
            );
        } catch {
          itens = [];
        }

        const textoProdutos =
          itens
            .map(
              (i) =>
                i.nome
            )
            .join(" ");

        const texto =
          [
            v.id,
            v.pagamento,
            v.descricao,
            v.created_at,
            dataHora(
              v.created_at
            ),
            textoProdutos,
          ]
            .join(" ")
            .toLocaleLowerCase(
              "pt-BR"
            );

        return texto.includes(
          busca
        );
      });

  /*
   * ==========================================================
   * LOGIN
   * ==========================================================
   */

  if (!logged) {
    return (
      <div
        className={
          "min-h-screen flex items-center justify-center p-6 " +
          (dark
            ? "bg-[#0A0A0C] text-white"
            : "bg-[#F6F6F7] text-black")
        }
      >
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
        />

        {toast && (
          <div className="fixed top-6 left-1/2 -translate-x-1/2 bg-zinc-900 text-white px-5 py-3 rounded-full text-sm z-50">
            {toast}
          </div>
        )}

        <div
          className={
            "w-full max-w-[380px] p-8 rounded-[24px] border " +
            (dark
              ? "bg-zinc-900 border-zinc-800"
              : "bg-white border-zinc-200")
          }
        >
          <h1 className="text-3xl font-bold">
            Freezer da Amanda
          </h1>

          <input
            placeholder="Usuário"
            value={
              loginForm.user
            }
            onChange={(e) =>
              setLoginForm({
                ...loginForm,
                user: e.target
                  .value,
              })
            }
            className={
              "mt-8 w-full p-3 rounded-xl bg-transparent border " +
              (dark
                ? "border-zinc-800"
                : "border-zinc-200")
            }
          />

          <input
            placeholder="Senha"
            type="password"
            value={
              loginForm.pass
            }
            onChange={(e) =>
              setLoginForm({
                ...loginForm,
                pass: e.target
                  .value,
              })
            }
            onKeyDown={(e) =>
              e.key ===
                "Enter" &&
              doLogin()
            }
            className={
              "mt-3 w-full p-3 rounded-xl bg-transparent border " +
              (dark
                ? "border-zinc-800"
                : "border-zinc-200")
            }
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

  const bg = dark
    ? "bg-[#0A0A0C] text-zinc-100"
    : "bg-[#F6F6F7] text-zinc-900";

  const card = dark
    ? "bg-zinc-900 border-zinc-800"
    : "bg-white border-zinc-200";

  const produtosAtivos =
    produtos.filter(
      (p) => p.qtd > 0
    );

  const totalCarrinho =
    cart.reduce(
      (s, i) =>
        s +
        parseFloat(
          i.preco
        ) *
          i.cartQtd,
      0
    );

  const totalQtd =
    cart.reduce(
      (s, i) =>
        s + i.cartQtd,
      0
    );

  const activeIndex =
    TABS.findIndex(
      (t) => t.id === tab
    );

  /*
   * ==========================================================
   * INTERFACE
   * ==========================================================
   */

  return (
    <div
      className={
        "min-h-screen flex flex-col items-center " +
        bg
      }
    >
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
      />

      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 bg-zinc-900 text-white px-5 py-3 rounded-full text-sm z-[200] border border-zinc-700 shadow-2xl">
          {toast}
        </div>
      )}

      <header className="w-full max-w-[1200px] px-6 py-4 flex justify-between items-center">
        <div>
          <div className="font-bold">
            Freezer da Amanda
          </div>

          <div className="text-[10px] opacity-40 uppercase">
            Sistema de vendas
          </div>
        </div>

        <div className="text-xs opacity-40">
          {TABS.find(
            (x) =>
              x.id === tab
          )?.label}
        </div>
      </header>

      <main className="w-full max-w-[1200px] flex-1 px-6 pb-48 pt-2">

        {/* =====================================================
            HOME
        ===================================================== */}

        {tab === "home" && (
          <div>
            <h1 className="text-3xl font-bold">
              Home
            </h1>

            <p className="text-xs opacity-60">
              {produtosAtivos.length}{" "}
              produtos disponíveis
            </p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
              {produtosAtivos.map(
                (p) => (
                  <div
                    key={p.id}
                    className={
                      "rounded-2xl border overflow-hidden " +
                      card
                    }
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
                        Estoque:{" "}
                        {p.qtd}
                      </p>

                      <div className="flex justify-between items-center mt-2">
                        <b>
                          {moeda(
                            Number(
                              p.preco
                            )
                          )}
                        </b>

                        <button
                          onClick={() =>
                            addToCart(
                              p
                            )
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
                )
              )}
            </div>
          </div>
        )}

        {/* =====================================================
            PDV
        ===================================================== */}

        {tab === "pdv" && (
          <div className="max-w-[700px] mx-auto">
            <h1 className="text-3xl font-bold">
              PDV - Produtos
            </h1>

            <p className="text-xs opacity-60">
              Adiciona e remove produtos
              do banco
            </p>

            <div
              className={
                "mt-4 rounded-2xl border divide-y " +
                card +
                " divide-zinc-800"
              }
            >
              {produtos.map(
                (p) => (
                  <div
                    key={p.id}
                    className={
                      "p-4 flex gap-3 items-center " +
                      (p.qtd <= 0
                        ? "opacity-40"
                        : "")
                    }
                  >
                    <img
                      src={p.imagem}
                      className="w-12 h-12 rounded-xl bg-white p-1 object-contain"
                    />

                    <div className="flex-1">
                      <p className="text-sm font-semibold">
                        {p.nome}{" "}
                        {p.qtd <=
                          0 &&
                          "(ESGOTADO)"}
                      </p>

                      <p className="text-xs opacity-60">
                        R${" "}
                        {
                          p.preco
                        }{" "}
                        •{" "}
                        {p.qtd}{" "}
                        un
                      </p>
                    </div>

                    <button
                      onClick={async () => {
                        const n =
                          prompt(
                            "Nova qtd:",
                            String(
                              p.qtd
                            )
                          );

                        if (
                          n ===
                          null
                        )
                          return;

                        await fetch(
                          "/api/produtos",
                          {
                            method:
                              "PUT",
                            headers:
                              {
                                "Content-Type":
                                  "application/json",
                              },
                            body: JSON.stringify(
                              {
                                id: p.id,
                                qtd: Number(
                                  n
                                ),
                              }
                            ),
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
                        deletarProduto(
                          p.id
                        )
                      }
                      className="w-8 h-8 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center"
                    >
                      <span className="material-symbols-rounded text-[18px]">
                        delete
                      </span>
                    </button>
                  </div>
                )
              )}
            </div>
          </div>
        )}

        {/* =====================================================
            ADICIONAR
        ===================================================== */}

        {tab === "add" && (
          <div className="max-w-[520px] mx-auto">
            <h1 className="text-3xl font-bold">
              Adicionar
            </h1>

            <p className="text-xs opacity-60">
              Se o nome for igual,
              soma no estoque.
            </p>

            <AddProduto
              fetchProdutos={
                fetchProdutos
              }
              showToast={
                showToast
              }
            />
          </div>
        )}

        {/* =====================================================
            DASH
        ===================================================== */}

        {tab === "dash" && (
          <div className="max-w-[700px] mx-auto">

            <div className="flex justify-between items-start gap-3">
              <div>
                <h1 className="text-3xl font-bold">
                  Dashboard
                </h1>

                <p className="text-xs opacity-50 mt-1">
                  Fechamento geral e
                  acertos
                </p>
              </div>

              <button
                onClick={
                  fazerFechamento
                }
                disabled={
                  fazendoFechamento
                }
                className="px-4 py-3 rounded-xl bg-[#D6FF57] text-black font-bold text-xs whitespace-nowrap"
              >
                {fazendoFechamento
                  ? "Fechando..."
                  : "Fazer Fechamento"}
              </button>
            </div>

            {(() => {
              const {
                mapa,
                porPagamento,
                porDescricao,
                semDescricao,
                totalGeral,
              } =
                resumoFechamento();

              return (
                <div className="mt-4 space-y-4">

                  {/* =========================================
                      FECHAMENTO GERAL
                  ========================================= */}

                  <div
                    className={
                      "p-4 rounded-2xl border " +
                      card
                    }
                  >
                    <p className="font-bold">
                      💰 Fechamento Geral
                    </p>

                    <p className="text-3xl font-bold mt-2">
                      {moeda(
                        totalGeral
                      )}
                    </p>

                    <p className="text-xs opacity-50 mt-1">
                      {vendas.length}{" "}
                      vendas
                    </p>

                    {/* PAGAMENTOS */}

                    <div className="mt-5 space-y-3">

                      {Object.entries(
                        porPagamento
                      ).map(
                        ([
                          pagamentoAtual,
                          dados,
                        ]) => (
                          <div
                            key={
                              pagamentoAtual
                            }
                            className="rounded-2xl bg-zinc-800 text-white overflow-hidden"
                          >
                            <div className="p-3 flex justify-between items-center border-b border-zinc-700">
                              <div className="flex items-center gap-2">
                                <span className="material-symbols-rounded text-[20px]">
                                  {pagamentoIcon(
                                    pagamentoAtual
                                  )}
                                </span>

                                <span className="font-bold uppercase text-sm">
                                  {
                                    pagamentoAtual
                                  }
                                </span>
                              </div>

                              <b className="text-[#D6FF57]">
                                {moeda(
                                  dados.total
                                )}
                              </b>
                            </div>

                            <div className="p-3">
                              <p className="text-[10px] uppercase opacity-50 mb-2">
                                Produtos e
                                quantidades
                              </p>

                              <div className="space-y-2">
                                {Object.entries(
                                  dados.produtos
                                ).map(
                                  ([
                                    nome,
                                    produto,
                                  ]) => (
                                    <div
                                      key={
                                        nome
                                      }
                                      className="flex justify-between items-center text-xs"
                                    >
                                      <div className="flex items-center gap-2">
                                        <span className="font-bold text-[#D6FF57]">
                                          {
                                            produto.qtd
                                          }x
                                        </span>

                                        <span>
                                          {
                                            nome
                                          }
                                        </span>
                                      </div>

                                      <span className="opacity-60">
                                        {moeda(
                                          produto.total
                                        )}
                                      </span>
                                    </div>
                                  )
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      )}

                      {Object.keys(
                        porPagamento
                      ).length ===
                        0 && (
                        <p className="text-xs opacity-50">
                          Nenhuma venda
                          registrada.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* =========================================
                      FECHAMENTOS POR DESCRIÇÃO
                  ========================================= */}

                  <div
                    className={
                      "p-4 rounded-2xl border " +
                      card
                    }
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-bold">
                          👤 Fechamentos por
                          descrição
                        </p>

                        <p className="text-xs opacity-50 mt-1">
                          Eduardo, João,
                          clientes, fiados
                          e outros
                        </p>
                      </div>

                      <span className="material-symbols-rounded opacity-50">
                        groups
                      </span>
                    </div>

                    <div className="mt-4 space-y-3">

                      {porDescricao.map(
                        ([
                          chave,
                          dados,
                        ]) => (
                          <div
                            key={
                              chave
                            }
                            className="rounded-2xl bg-zinc-800 text-white overflow-hidden"
                          >
                            <div className="p-3 flex justify-between items-center border-b border-zinc-700">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-[#D6FF57] text-black flex items-center justify-center">
                                  <span className="material-symbols-rounded text-[18px]">
                                    person
                                  </span>
                                </div>

                                <div>
                                  <p className="font-bold text-sm">
                                    {
                                      dados.nome
                                    }
                                  </p>

                                  <p className="text-[10px] opacity-50">
                                    Produtos
                                    vendidos
                                  </p>
                                </div>
                              </div>

                              <b className="text-[#D6FF57]">
                                {moeda(
                                  dados.total
                                )}
                              </b>
                            </div>

                            <div className="p-3 space-y-2">
                              {Object.entries(
                                dados.produtos
                              ).map(
                                ([
                                  nome,
                                  produto,
                                ]) => (
                                  <div
                                    key={
                                      nome
                                    }
                                    className="flex justify-between text-xs"
                                  >
                                    <span>
                                      <b className="text-[#D6FF57]">
                                        {
                                          produto.qtd
                                        }x
                                      </b>{" "}
                                      {
                                        nome
                                      }
                                    </span>

                                    <span className="opacity-60">
                                      {moeda(
                                        produto.total
                                      )}
                                    </span>
                                  </div>
                                )
                              )}
                            </div>
                          </div>
                        )
                      )}

                      {/* SEM DESCRIÇÃO */}

                      {Object.keys(
                        semDescricao.produtos
                      ).length >
                        0 && (
                        <div className="rounded-2xl bg-zinc-800 text-white overflow-hidden">
                          <div className="p-3 flex justify-between items-center border-b border-zinc-700">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center">
                                <span className="material-symbols-rounded">
                                  receipt_long
                                </span>
                              </div>

                              <div>
                                <p className="font-bold text-sm">
                                  Sem descrição
                                </p>

                                <p className="text-[10px] opacity-50">
                                  Vendas sem
                                  observação
                                </p>
                              </div>
                            </div>

                            <b className="text-[#D6FF57]">
                              {moeda(
                                semDescricao.total
                              )}
                            </b>
                          </div>

                          <div className="p-3 space-y-2">
                            {Object.entries(
                              semDescricao.produtos
                            ).map(
                              ([
                                nome,
                                produto,
                              ]) => (
                                <div
                                  key={
                                    nome
                                  }
                                  className="flex justify-between text-xs"
                                >
                                  <span>
                                    <b className="text-[#D6FF57]">
                                      {
                                        produto.qtd
                                      }x
                                    </b>{" "}
                                    {
                                      nome
                                    }
                                  </span>

                                  <span className="opacity-60">
                                    {moeda(
                                      produto.total
                                    )}
                                  </span>
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      )}

                      {porDescricao.length ===
                        0 &&
                        Object.keys(
                          semDescricao.produtos
                        ).length ===
                          0 && (
                          <p className="text-xs opacity-50">
                            Nenhuma
                            descrição
                            registrada.
                          </p>
                        )}
                    </div>
                  </div>

                  {/* =========================================
                      PRODUTOS GERAIS
                  ========================================= */}

                  <div
                    className={
                      "p-4 rounded-2xl border " +
                      card
                    }
                  >
                    <p className="font-bold">
                      📦 Produtos Vendidos
                    </p>

                    <div className="mt-3 space-y-2 text-sm">
                      {Object.entries(
                        mapa
                      ).map(
                        ([
                          nome,
                          d,
                        ]) => (
                          <div
                            key={
                              nome
                            }
                            className="flex justify-between"
                          >
                            <span>
                              {d.qtd}x{" "}
                              {nome}
                            </span>

                            <b>
                              {moeda(
                                d.total
                              )}
                            </b>
                          </div>
                        )
                      )}

                      {Object.keys(
                        mapa
                      ).length ===
                        0 && (
                        <p className="opacity-50 text-xs">
                          Nenhuma venda.
                        </p>
                      )}
                    </div>
                  </div>

                </div>
              );
            })()}
          </div>
        )}

        {/* =====================================================
            FECHAMENTOS
        ===================================================== */}

        {tab ===
          "fechamentos" && (
          <div className="max-w-[700px] mx-auto">

            <div className="flex justify-between items-start gap-3">
              <div>
                <h1 className="text-3xl font-bold">
                  Fechamentos
                </h1>

                <p className="text-xs opacity-50 mt-1">
                  Histórico dos acertos
                  realizados
                </p>
              </div>

              <button
                onClick={
                  fazerFechamento
                }
                disabled={
                  fazendoFechamento
                }
                className="px-4 py-3 rounded-xl bg-[#D6FF57] text-black font-bold text-xs"
              >
                {fazendoFechamento
                  ? "Fechando..."
                  : "Fazer Fechamento"}
              </button>
            </div>

            <div className="mt-5 space-y-3">

              {fechamentos.map(
                (f) => {
                  const aberto =
                    fechamentoAberto ===
                    f.id;

                  return (
                    <div
                      key={f.id}
                      className={
                        "rounded-2xl border overflow-hidden " +
                        card
                      }
                    >

                      {/* BOTÃO DO FECHAMENTO */}

                      <button
                        onClick={() =>
                          abrirFechamento(
                            f.id
                          )
                        }
                        className="w-full p-4 text-left"
                      >
                        <div className="flex justify-between items-center">

                          <div className="flex items-center gap-3">

                            <div className="w-11 h-11 rounded-xl bg-[#D6FF57] text-black flex items-center justify-center font-bold text-xs">
                              #
                              {String(
                                f.numero
                              ).padStart(
                                3,
                                "0"
                              )}
                            </div>

                            <div>
                              <p className="font-bold">
                                #
                                {String(
                                  f.numero
                                ).padStart(
                                  3,
                                  "0"
                                )}{" "}
                                —{" "}
                                {dataFechamento(
                                  f.created_at
                                )}
                              </p>

                              <p className="text-[11px] opacity-50 mt-1">
                                {f.quantidade_vendas}{" "}
                                vendas •{" "}
                                {f.quantidade_itens}{" "}
                                itens
                              </p>
                            </div>

                          </div>

                          <div className="text-right">

                            <b className="text-[#D6FF57]">
                              {moeda(
                                f.total
                              )}
                            </b>

                            <span className="material-symbols-rounded block text-right mt-1 opacity-50">
                              {aberto
                                ? "expand_less"
                                : "expand_more"}
                            </span>

                          </div>

                        </div>
                      </button>

                      {/* CONTEÚDO */}

                      {aberto && (
                        <div className="border-t border-zinc-800 p-4">

                          {loadingFechamento &&
                            !fechamentoDetalhe && (
                              <div className="py-8 text-center text-sm opacity-50">
                                Carregando
                                fechamento...
                              </div>
                            )}

                          {fechamentoDetalhe &&
                            fechamentoDetalhe.id ===
                              f.id && (
                              <FechamentoVisual
                                fechamento={
                                  fechamentoDetalhe
                                }
                                moeda={
                                  moeda
                                }
                              />
                            )}

                        </div>
                      )}

                    </div>
                  );
                }
              )}

              {fechamentos.length ===
                0 && (
                <div
                  className={
                    "p-8 rounded-2xl border text-center " +
                    card
                  }
                >
                  <span className="material-symbols-rounded text-4xl opacity-30">
                    receipt_long
                  </span>

                  <p className="font-bold mt-3">
                    Nenhum fechamento
                  </p>

                  <p className="text-xs opacity-50 mt-1">
                    Faça o primeiro
                    fechamento pelo
                    Dashboard.
                  </p>
                </div>
              )}

            </div>
          </div>
        )}

        {/* =====================================================
            LOG
        ===================================================== */}

        {tab === "log" && (
          <div className="max-w-[800px] mx-auto">

            <h1 className="text-3xl font-bold">
              Log de Vendas
            </h1>

            <p className="text-xs opacity-50 mt-1">
              Todas as vendas registradas
              no sistema.
            </p>

            {/* PESQUISA */}

            <div
              className={
                "mt-5 p-3 rounded-2xl border flex items-center gap-3 " +
                card
              }
            >
              <span className="material-symbols-rounded opacity-50">
                search
              </span>

              <input
                value={
                  pesquisaLog
                }
                onChange={(e) =>
                  setPesquisaLog(
                    e.target
                      .value
                  )
                }
                placeholder="Pesquisar data, hora, descrição, produto..."
                className="flex-1 bg-transparent outline-none text-sm"
              />

              {pesquisaLog && (
                <button
                  onClick={() =>
                    setPesquisaLog(
                      ""
                    )
                  }
                  className="opacity-50"
                >
                  <span className="material-symbols-rounded">
                    close
                  </span>
                </button>
              )}
            </div>

            <p className="text-[11px] opacity-40 mt-3">
              {vendasFiltradas.length}{" "}
              venda(s)
            </p>

            <div className="mt-3 space-y-3">

              {vendasFiltradas.map(
                (v) => {

                  let itens: CartItem[] =
                    [];

                  try {
                    itens =
                      JSON.parse(
                        v.itens
                      );
                  } catch {
                    itens = [];
                  }

                  const qtdTotal =
                    itens.reduce(
                      (s, i) =>
                        s +
                        Number(
                          i.cartQtd
                        ),
                      0
                    );

                  return (
                    <div
                      key={
                        v.id
                      }
                      className={
                        "p-4 rounded-2xl border " +
                        card
                      }
                    >

                      <div className="flex justify-between gap-3">

                        <div>
                          <p className="font-bold">
                            Venda #
                            {v.id}
                          </p>

                          <p className="text-[11px] opacity-50 mt-1">
                            {dataHora(
                              v.created_at
                            )}
                          </p>
                        </div>

                        <div className="text-right">
                          <b className="text-[#D6FF57]">
                            {moeda(
                              Number(
                                v.total
                              )
                            )}
                          </b>

                          <p className="text-[10px] uppercase opacity-50 mt-1">
                            {
                              v.pagamento
                            }
                          </p>
                        </div>

                      </div>

                      {/* PRODUTOS */}

                      <div className="mt-4 pt-3 border-t border-zinc-800">

                        <p className="text-[10px] uppercase opacity-40 mb-2">
                          Produtos •{" "}
                          {qtdTotal}{" "}
                          itens
                        </p>

                        <div className="space-y-2">

                          {itens.map(
                            (
                              item,
                              index
                            ) => (
                              <div
                                key={
                                  index
                                }
                                className="flex justify-between text-xs"
                              >
                                <span>
                                  <b className="text-[#D6FF57]">
                                    {
                                      item.cartQtd
                                    }x
                                  </b>{" "}
                                  {
                                    item.nome
                                  }
                                </span>

                                <span className="opacity-60">
                                  {moeda(
                                    Number(
                                      item.preco
                                    ) *
                                      Number(
                                        item.cartQtd
                                      )
                                  )}
                                </span>
                              </div>
                            )
                          )}

                        </div>
                      </div>

                      {/* DESCRIÇÃO */}

                      {v.descricao &&
                        v.descricao.trim() && (
                          <div className="mt-3 p-3 rounded-xl bg-zinc-800 text-white">

                            <p className="text-[10px] uppercase opacity-40">
                              Descrição
                            </p>

                            <p className="text-sm mt-1">
                              📝{" "}
                              {
                                v.descricao
                              }
                            </p>

                          </div>
                        )}

                    </div>
                  );
                }
              )}

              {vendasFiltradas.length ===
                0 && (
                <div
                  className={
                    "p-8 rounded-2xl border text-center " +
                    card
                  }
                >
                  <span className="material-symbols-rounded text-4xl opacity-30">
                    search_off
                  </span>

                  <p className="font-bold mt-3">
                    Nenhuma venda
                    encontrada
                  </p>

                  <p className="text-xs opacity-50 mt-1">
                    Tente outra data,
                    hora, descrição ou
                    produto.
                  </p>
                </div>
              )}

            </div>
          </div>
        )}

        {/* =====================================================
            CONFIGURAÇÕES
        ===================================================== */}

        {tab ===
          "settings" && (
          <div className="max-w-[520px] mx-auto">

            <h1 className="text-3xl font-bold">
              Config
            </h1>

            <div
              className={
                "mt-6 p-6 rounded-2xl border space-y-6 " +
                card
              }
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
                    setDark(
                      !dark
                    )
                  }
                  className={
                    "px-4 py-2 rounded-full border " +
                    (dark
                      ? "bg-zinc-800"
                      : "bg-zinc-100")
                  }
                >
                  {dark
                    ? "Dark"
                    : "Light"}
                </button>

              </div>

              <button
                onClick={() => {
                  sessionStorage.removeItem(
                    "freezer_logged"
                  );

                  setLogged(
                    false
                  );
                }}
                className="w-full py-3 rounded-xl border border-red-500/30 text-red-500"
              >
                Sair
              </button>

            </div>
          </div>
        )}

      </main>

      {/* =======================================================
          CARRINHO
      ======================================================= */}

      {cart.length > 0 && (
        <div
          className={
            "fixed bottom-28 left-1/2 -translate-x-1/2 w-[96%] max-w-[460px] rounded-[24px] p-4 shadow-2xl z-40 border " +
            card
          }
        >

          <div className="flex justify-between items-center mb-3">
            <b className="flex items-center gap-2">
              <span className="material-symbols-rounded">
                shopping_cart
              </span>

              {totalQtd}{" "}
              itens
            </b>

            <b>
              {moeda(
                totalCarrinho
              )}
            </b>
          </div>

          <div className="max-h-[140px] overflow-auto space-y-2 mb-3">

            {cart.map(
              (i) => (
                <div
                  key={
                    i.id
                  }
                  className="flex items-center gap-2 bg-zinc-800 rounded-xl p-2 text-white"
                >

                  <img
                    src={
                      i.imagem
                    }
                    className="w-8 h-8 bg-white rounded object-contain"
                  />

                  <span className="flex-1 text-xs truncate">
                    {
                      i.nome
                    }
                  </span>

                  <div className="flex items-center gap-1">

                    <button
                      onClick={() =>
                        setCart(
                          (
                            c
                          ) =>
                            c.map(
                              (
                                x
                              ) =>
                                x.id ===
                                i.id
                                  ? {
                                      ...x,
                                      cartQtd:
                                        Math.max(
                                          1,
                                          x.cartQtd -
                                            1
                                        ),
                                    }
                                  : x
                            )
                        )
                      }
                      className="w-7 h-7 rounded-full bg-zinc-700"
                    >
                      -
                    </button>

                    <span className="w-5 text-center text-sm">
                      {
                        i.cartQtd
                      }
                    </span>

                    <button
                      onClick={() => {
                        const estoque =
                          produtos.find(
                            (
                              p
                            ) =>
                              p.id ===
                              i.id
                          )
                            ?.qtd ||
                          0;

                        if (
                          i.cartQtd >=
                          estoque
                        ) {
                          showToast(
                            "Estoque: " +
                              estoque
                          );

                          return;
                        }

                        setCart(
                          (
                            c
                          ) =>
                            c.map(
                              (
                                x
                              ) =>
                                x.id ===
                                i.id
                                  ? {
                                      ...x,
                                      cartQtd:
                                        x.cartQtd +
                                        1,
                                    }
                                  : x
                            )
                        );
                      }}
                      className="w-7 h-7 rounded-full bg-zinc-700"
                    >
                      +
                    </button>

                  </div>

                  <button
                    onClick={() =>
                      setCart(
                        (
                          c
                        ) =>
                          c.filter(
                            (
                              x
                            ) =>
                              x.id !==
                              i.id
                          )
                      )
                    }
                    className="w-7 h-7 rounded-full bg-red-500/20 text-red-400"
                  >
                    <span className="material-symbols-rounded text-[16px]">
                      close
                    </span>
                  </button>

                </div>
              )
            )}

          </div>

          <button
            onClick={() =>
              setShowCheckout(
                true
              )
            }
            className="w-full py-3 rounded-xl bg-[#D6FF57] text-black font-bold"
          >
            Finalizar Venda
          </button>

        </div>
      )}

      {/* =======================================================
          CHECKOUT
      ======================================================= */}

      {showCheckout && (
        <div className="fixed inset-0 bg-black/70 z-[100] flex items-end md:items-center justify-center p-4">

          <div
            className={
              "w-full max-w-[460px] rounded-[24px] p-6 space-y-4 border " +
              card
            }
          >

            <div className="flex justify-between">

              <h2 className="font-bold text-xl">
                Finalizar
              </h2>

              <button
                onClick={() =>
                  setShowCheckout(
                    false
                  )
                }
              >
                <span className="material-symbols-rounded">
                  close
                </span>
              </button>

            </div>

            <p className="text-sm opacity-60">
              {totalQtd}{" "}
              itens •{" "}
              {moeda(
                totalCarrinho
              )}
            </p>

            <div className="grid grid-cols-4 gap-2">

              {[
                {
                  id: "pix",
                  icon: "qr_code",
                },
                {
                  id: "dinheiro",
                  icon: "payments",
                },
                {
                  id: "cartao",
                  icon: "credit_card",
                },
                {
                  id: "vale",
                  icon: "receipt_long",
                },
              ].map(
                (m) => (
                  <button
                    key={
                      m.id
                    }
                    onClick={() =>
                      setPagamento(
                        m.id
                      )
                    }
                    className={
                      "p-3 rounded-xl border flex flex-col items-center gap-1 " +
                      (pagamento ===
                      m.id
                        ? "bg-[#D6FF57] text-black border-[#D6FF57]"
                        : "border-zinc-700")
                    }
                  >
                    <span className="material-symbols-rounded">
                      {
                        m.icon
                      }
                    </span>

                    <span className="text-[10px] uppercase">
                      {
                        m.id
                      }
                    </span>
                  </button>
                )
              )}

            </div>

            <textarea
              placeholder="Descrição (cliente, fiado...)"
              value={
                descricao
              }
              onChange={(e) =>
                setDescricao(
                  e.target
                    .value
                )
              }
              className="w-full p-3 rounded-xl bg-transparent border border-zinc-700 h-20"
            />

            <button
              onClick={
                finalizarVenda
              }
              className="w-full py-4 rounded-xl bg-[#D6FF57] text-black font-bold"
            >
              Confirmar{" "}
              {moeda(
                totalCarrinho
              )}
            </button>

          </div>
        </div>
      )}

      {/* =======================================================
          NAVEGAÇÃO
      ======================================================= */}

      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[96%] max-w-[760px] z-50">

        <div className="relative rounded-[28px] p-2 flex justify-between items-center bg-[#151517] border border-zinc-800 shadow-2xl overflow-x-auto">

          <div
            className="absolute top-1/2 -translate-y-1/2 transition-all duration-500 pointer-events-none"
            style={{
              left:
                activeIndex *
                  (100 /
                    TABS.length) +
                1 +
                "%",
              width:
                100 /
                  TABS.length -
                2 +
                "%",
            }}
          >
            <div className="w-[52px] h-[52px] mx-auto rounded-full flex items-center justify-center bg-[#D6FF57]">
              <span className="material-symbols-rounded text-black">
                {
                  TABS[
                    activeIndex
                  ].icon
                }
              </span>
            </div>
          </div>

          {TABS.map(
            (t) => (
              <button
                key={
                  t.id
                }
                onClick={() =>
                  setTab(
                    t.id
                  )
                }
                className={
                  "relative z-10 min-w-[70px] h-[56px] flex flex-col items-center justify-center gap-0.5 " +
                  (tab ===
                  t.id
                    ? "opacity-0"
                    : "opacity-50 text-white")
                }
              >
                <span className="material-symbols-rounded text-[23px]">
                  {
                    t.icon
                  }
                </span>

                <span className="text-[8px] uppercase">
                  {
                    t.label
                  }
                </span>
              </button>
            )
          )}

        </div>
      </div>

    </div>
  );
}

/*
|--------------------------------------------------------------------------
| COMPONENTE — VISUALIZAÇÃO DO FECHAMENTO
|--------------------------------------------------------------------------
*/

function FechamentoVisual({
  fechamento,
  moeda,
}: {
  fechamento: FechamentoDetalhe;
  moeda: (valor: number) => string;
}) {
  const resumo =
    fechamento.resumo;

  return (
    <div className="space-y-4">

      {/* ==========================================================
          CABEÇALHO
      ========================================================== */}

      <div className="p-4 rounded-2xl bg-zinc-800 text-white">

        <p className="text-[10px] uppercase opacity-40">
          Fechamento Geral
        </p>

        <p className="text-3xl font-bold mt-1 text-[#D6FF57]">
          {moeda(
            resumo
              .fechamentoGeral
              .total
          )}
        </p>

        <p className="text-xs opacity-50 mt-1">
          {
            resumo
              .fechamentoGeral
              .quantidadeVendas
          }{" "}
          vendas •{" "}
          {
            resumo
              .fechamentoGeral
              .quantidadeItens
          }{" "}
          itens
        </p>

      </div>

      {/* ==========================================================
          FORMAS DE PAGAMENTO
      ========================================================== */}

      <div
        className="p-4 rounded-2xl bg-zinc-800 text-white"
      >

        <p className="font-bold">
          💳 Formas de pagamento
        </p>

        <div className="mt-3 space-y-3">

          {Object.entries(
            resumo.porPagamento
          ).map(
            ([
              pagamento,
              dados,
            ]) => (
              <div
                key={
                  pagamento
                }
                className="rounded-xl border border-zinc-700 overflow-hidden"
              >

                <div className="p-3 flex justify-between">
                  <b className="uppercase text-xs">
                    {
                      pagamento
                    }
                  </b>

                  <b className="text-[#D6FF57]">
                    {moeda(
                      dados.total
                    )}
                  </b>
                </div>

                <div className="border-t border-zinc-700 p-3 space-y-2">

                  {Object.entries(
                    dados.produtos
                  ).map(
                    ([
                      nome,
                      produto,
                    ]) => (
                      <div
                        key={
                          nome
                        }
                        className="flex justify-between text-xs"
                      >
                        <span>
                          <b className="text-[#D6FF57]">
                            {
                              produto.qtd
                            }x
                          </b>{" "}
                          {
                            nome
                          }
                        </span>

                        <span className="opacity-60">
                          {moeda(
                            produto.total
                          )}
                        </span>
                      </div>
                    )
                  )}

                </div>

              </div>
            )
          )}

        </div>
      </div>

      {/* ==========================================================
          POR DESCRIÇÃO
      ========================================================== */}

      <div
        className="p-4 rounded-2xl bg-zinc-800 text-white"
      >

        <p className="font-bold">
          👤 Fechamentos por
          descrição
        </p>

        <div className="mt-3 space-y-3">

          {resumo.porDescricao.map(
            (
              grupo,
              index
            ) => (
              <div
                key={
                  grupo.nome +
                  index
                }
                className="rounded-xl border border-zinc-700 overflow-hidden"
              >

                <div className="p-3 flex justify-between items-center">
                  <div>
                    <p className="font-bold text-sm">
                      {
                        grupo.nome
                      }
                    </p>

                    <p className="text-[10px] opacity-40">
                      Produtos
                    </p>
                  </div>

                  <b className="text-[#D6FF57]">
                    {moeda(
                      grupo.total
                    )}
                  </b>
                </div>

                <div className="border-t border-zinc-700 p-3 space-y-2">

                  {Object.entries(
                    grupo.produtos
                  ).map(
                    ([
                      nome,
                      produto,
                    ]) => (
                      <div
                        key={
                          nome
                        }
                        className="flex justify-between text-xs"
                      >
                        <span>
                          <b className="text-[#D6FF57]">
                            {
                              produto.qtd
                            }x
                          </b>{" "}
                          {
                            nome
                          }
                        </span>

                        <span className="opacity-60">
                          {moeda(
                            produto.total
                          )}
                        </span>
                      </div>
                    )
                  )}

                </div>

              </div>
            )
          )}

          {/* SEM DESCRIÇÃO */}

          {Object.keys(
            resumo.semDescricao
              .produtos
          ).length > 0 && (
            <div className="rounded-xl border border-zinc-700 overflow-hidden">

              <div className="p-3 flex justify-between items-center">
                <div>
                  <p className="font-bold text-sm">
                    Sem descrição
                  </p>

                  <p className="text-[10px] opacity-40">
                    Sempre aparece por
                    último
                  </p>
                </div>

                <b className="text-[#D6FF57]">
                  {moeda(
                    resumo
                      .semDescricao
                      .total
                  )}
                </b>
              </div>

              <div className="border-t border-zinc-700 p-3 space-y-2">

                {Object.entries(
                  resumo
                    .semDescricao
                    .produtos
                ).map(
                  ([
                    nome,
                    produto,
                  ]) => (
                    <div
                      key={
                        nome
                      }
                      className="flex justify-between text-xs"
                    >
                      <span>
                        <b className="text-[#D6FF57]">
                          {
                            produto.qtd
                          }x
                        </b>{" "}
                        {
                          nome
                        }
                      </span>

                      <span className="opacity-60">
                        {moeda(
                          produto.total
                        )}
                      </span>
                    </div>
                  )
                )}

              </div>

            </div>
          )}

        </div>
      </div>

      {/* ==========================================================
          PRODUTOS GERAIS
      ========================================================== */}

      <div
        className="p-4 rounded-2xl bg-zinc-800 text-white"
      >

        <p className="font-bold">
          📦 Produtos do fechamento
        </p>

        <div className="mt-3 space-y-2">

          {Object.entries(
            resumo.produtos
          ).map(
            ([
              nome,
              produto,
            ]) => (
              <div
                key={
                  nome
                }
                className="flex justify-between text-xs"
              >
                <span>
                  <b className="text-[#D6FF57]">
                    {
                      produto.qtd
                    }x
                  </b>{" "}
                  {
                    nome
                  }
                </span>

                <span>
                  {moeda(
                    produto.total
                  )}
                </span>
              </div>
            )
          )}

        </div>

      </div>

    </div>
  );
}

/*
|--------------------------------------------------------------------------
| ADICIONAR PRODUTO
|--------------------------------------------------------------------------
*/

function AddProduto({
  fetchProdutos,
  showToast,
}: any) {
  const [form, setForm] =
    useState({
      nome: "",
      preco: "",
      qtd: "",
      imagem: "",
    });

  const [loading, setLoading] =
    useState(false);

  async function save() {
    if (
      !form.nome ||
      !form.preco
    ) {
      return showToast(
        "Nome e preço"
      );
    }

    if (!form.imagem) {
      return showToast(
        "Escolha imagem"
      );
    }

    setLoading(true);

    try {
      const r =
        await fetch(
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
                form.qtd ||
                  "0"
              ),
              imagem:
                form.imagem,
            }),
          }
        );

      if (!r.ok) {
        const data =
          await r
            .json()
            .catch(
              () => ({})
            );

        throw new Error(
          data.error ||
            "Erro banco"
        );
      }

      const data =
        await r.json();

      setForm({
        nome: "",
        preco: "",
        qtd: "",
        imagem: "",
      });

      fetchProdutos();

      showToast(
        data.qtd
          ? `Estoque somado! Agora ${data.qtd} un`
          : "Produto salvo!"
      );
    } catch (e: any) {
      showToast(
        e.message
      );
    }

    setLoading(false);
  }

  return (
    <div className="mt-6 p-6 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-4">

      <div className="grid grid-cols-4 gap-2">

        {GALERIA.map(
          (img) => (
            <button
              key={
                img.nome
              }
              onClick={() =>
                setForm({
                  ...form,
                  imagem:
                    img.url,
                  nome:
                    form.nome ||
                    img.nome,
                })
              }
              className={
                "h-20 rounded-xl bg-white p-1 border-2 " +
                (form.imagem ===
                img.url
                  ? "border-[#D6FF57]"
                  : "border-transparent")
              }
            >
              <img
                src={
                  img.url
                }
                className="w-full h-full object-contain"
              />
            </button>
          )
        )}

      </div>

      {form.imagem && (
        <div className="flex gap-3 items-center p-2 bg-zinc-800 rounded-xl text-white">

          <img
            src={
              form.imagem
            }
            className="w-12 h-12 bg-white rounded p-1 object-contain"
          />

          <span className="text-sm">
            {
              form.nome
            }
          </span>

        </div>
      )}

      <input
        placeholder="Nome"
        value={
          form.nome
        }
        onChange={(e) =>
          setForm({
            ...form,
            nome:
              e.target
                .value,
          })
        }
        className="w-full p-3 rounded-xl bg-transparent border border-zinc-700 text-white"
      />

      <div className="grid grid-cols-2 gap-3">

        <input
          placeholder="Preço"
          type="number"
          value={
            form.preco
          }
          onChange={(e) =>
            setForm({
              ...form,
              preco:
                e.target
                  .value,
            })
          }
          className="p-3 rounded-xl bg-transparent border border-zinc-700 text-white"
        />

        <input
          placeholder="Qtd"
          type="number"
          value={
            form.qtd
          }
          onChange={(e) =>
            setForm({
              ...form,
              qtd:
                e.target
                  .value,
            })
          }
          className="p-3 rounded-xl bg-transparent border border-zinc-700 text-white"
        />

      </div>

      <button
        onClick={save}
        disabled={
          loading
        }
        className="w-full py-3 rounded-xl bg-[#D6FF57] text-black font-bold"
      >
        {loading
          ? "Salvando..."
          : "Salvar"}
      </button>

    </div>
  );
}