"use client";

import { useEffect, useMemo, useRef, useState } from "react";

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
  fechamento_id?: number | null;
  fechado?: number | boolean;
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
  numero?: number;
  created_at: string;
  total?: number;
  dados?: any;
};

const TABS: {
  id: Tab;
  icon: string;
  label: string;
}[] = [
  {
    id: "home",
    icon: "home",
    label: "Início",
  },
  {
    id: "pdv",
    icon: "inventory_2",
    label: "PDV",
  },
  {
    id: "add",
    icon: "add_box",
    label: "Adicionar",
  },
  {
    id: "dash",
    icon: "monitoring",
    label: "Dash",
  },
  {
    id: "fechamentos",
    icon: "receipt_long",
    label: "Fechamentos",
  },
  {
    id: "log",
    icon: "history",
    label: "Log",
  },
  {
    id: "settings",
    icon: "settings",
    label: "Config",
  },
];

const NAV_TABS: {
  id: Tab;
  icon: string;
}[] = [
  {
    id: "home",
    icon: "home",
  },
  {
    id: "pdv",
    icon: "inventory_2",
  },
  {
    id: "dash",
    icon: "monitoring",
  },
  {
    id: "fechamentos",
    icon: "receipt_long",
  },
  {
    id: "settings",
    icon: "settings",
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

function normalizarDescricao(value: string) {
  return String(value || "")
    .trim()
    .toLocaleLowerCase("pt-BR");
}

function dinheiro(value: number) {
  return Number(value || 0).toLocaleString(
    "pt-BR",
    {
      style: "currency",
      currency: "BRL",
    }
  );
}

function parseItens(
  itens: string
): CartItem[] {
  try {
    const data = JSON.parse(itens);

    return Array.isArray(data)
      ? data
      : [];
  } catch {
    return [];
  }
}

function formatarData(value: string) {
  if (!value) return "-";

  const d = new Date(value);

  if (Number.isNaN(d.getTime())) {
    return value;
  }

  return d.toLocaleString("pt-BR");
}

function formatarDataFechamento(
  value: string
) {
  if (!value) return "-";

  const d = new Date(value);

  if (Number.isNaN(d.getTime())) {
    return value;
  }

  return d.toLocaleDateString(
    "pt-BR",
    {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }
  );
}

function numeroFechamento(
  fechamento: Fechamento,
  index: number
) {
  return String(
    fechamento.numero ||
      fechamento.id ||
      index + 1
  ).padStart(3, "0");
}

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

  const [vendasHistorico, setVendasHistorico] =
    useState<Venda[]>([]);

  const [fechamentos, setFechamentos] =
    useState<Fechamento[]>([]);

  const [pagamento, setPagamento] =
    useState("pix");

  const [descricao, setDescricao] =
    useState("");

  const [showCheckout, setShowCheckout] =
    useState(false);

  const [showConfirmFechamento, setShowConfirmFechamento] =
    useState(false);

  const [fazendoFechamento, setFazendoFechamento] =
    useState(false);

  const [toast, setToast] =
    useState<string | null>(null);

  const [savedPass, setSavedPass] =
    useState("pdvadmin123");

  const [newPass, setNewPass] =
    useState("");

  const [logBusca, setLogBusca] =
    useState("");

  const [fechamentoAberto, setFechamentoAberto] =
    useState<number | null>(null);

  const afkRef =
    useRef<any>(null);

  const showToast = (message: string) => {
    setToast(message);

    setTimeout(() => {
      setToast(null);
    }, 3000);
  };

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

    const events = [
      "mousemove",
      "keydown",
      "touchstart",
      "click",
      "scroll",
    ];

    events.forEach((event) =>
      window.addEventListener(
        event,
        reset
      )
    );

    reset();

    return () => {
      events.forEach((event) =>
        window.removeEventListener(
          event,
          reset
        )
      );

      clearTimeout(
        afkRef.current
      );
    };
  }, [logged]);

  async function fetchProdutos() {
    try {
      const response =
        await fetch(
          "/api/produtos",
          {
            cache: "no-store",
          }
        );

      const data =
        await response.json();

      if (Array.isArray(data)) {
        setProdutos(data);
      }
    } catch {
      showToast(
        "Erro ao carregar produtos"
      );
    }
  }

  /*
   * VENDAS ATUAIS
   *
   * A API /api/vendas deve retornar somente
   * vendas ainda não fechadas.
   */
  async function fetchVendas() {
    try {
      const response =
        await fetch(
          "/api/vendas",
          {
            cache: "no-store",
          }
        );

      const data =
        await response.json();

      if (Array.isArray(data)) {
        setVendas(data);
      }
    } catch {
      showToast(
        "Erro ao carregar vendas"
      );
    }
  }

  /*
   * LOG
   *
   * Aqui buscamos todas as vendas,
   * inclusive as já fechadas.
   *
   * A rota pode aceitar ?historico=true.
   */
  async function fetchHistoricoVendas() {
    try {
      const response =
        await fetch(
          "/api/vendas?historico=true",
          {
            cache: "no-store",
          }
        );

      const data =
        await response.json();

      if (Array.isArray(data)) {
        setVendasHistorico(data);
      }
    } catch {
      /*
       * Fallback:
       *
       * Se a API ainda não possuir
       * ?historico=true, usamos as vendas
       * que já foram carregadas.
       */
      setVendasHistorico(
        vendas
      );
    }
  }

  async function fetchFechamentos() {
    try {
      const response =
        await fetch(
          "/api/fechamentos",
          {
            cache: "no-store",
          }
        );

      if (!response.ok) {
        return;
      }

      const data =
        await response.json();

      if (Array.isArray(data)) {
        setFechamentos(data);
      }
    } catch {
      /*
       * Não quebra o sistema caso
       * a rota ainda não esteja criada.
       */
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

      sessionStorage.setItem(
        "freezer_logged",
        "true"
      );

      setLoginForm({
        user: "",
        pass: "",
      });

      return;
    }

    showToast(
      "Usuário ou senha incorretos"
    );
  }

  function addToCart(
    produto: Produto
  ) {
    if (produto.qtd <= 0) {
      return showToast(
        "Sem estoque"
      );
    }

    setCart((previous) => {
      const existing =
        previous.find(
          (item) =>
            item.id ===
            produto.id
        );

      if (existing) {
        if (
          existing.cartQtd >=
          produto.qtd
        ) {
          showToast(
            "Estoque máximo: " +
              produto.qtd
          );

          return previous;
        }

        return previous.map(
          (item) =>
            item.id ===
            produto.id
              ? {
                  ...item,
                  cartQtd:
                    item.cartQtd +
                    1,
                }
              : item
        );
      }

      return [
        ...previous,
        {
          ...produto,
          cartQtd: 1,
        },
      ];
    });
  }

  async function finalizarVenda() {
    if (cart.length === 0) {
      return showToast(
        "Carrinho vazio"
      );
    }

    const total =
      cart.reduce(
        (sum, item) =>
          sum +
          (parseFloat(
            item.preco
          ) || 0) *
            item.cartQtd,
        0
      );

    try {
      const response =
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
        await response.json();

      if (!response.ok) {
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

      setTab("dash");

      showToast(
        "Venda salva!"
      );
    } catch (error: any) {
      showToast(
        error?.message ||
          "Erro ao salvar venda"
      );
    }
  }

  /*
   * ============================================================
   * FAZER FECHAMENTO
   * ============================================================
   *
   * NÃO apagamos vendas diretamente pelo frontend.
   *
   * A rota /api/fechamentos recebe as vendas
   * atuais e transforma o ciclo atual em
   * um fechamento.
   *
   * As vendas continuam no Turso para histórico.
   */
  async function fazerFechamento() {
    if (vendas.length === 0) {
      setShowConfirmFechamento(false);

      return showToast(
        "Não existem vendas para fechar."
      );
    }

    setFazendoFechamento(
      true
    );

    try {
      const resumo =
        criarResumo(
          vendas
        );

      const response =
        await fetch(
          "/api/fechamentos",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              vendas,
              resumo,
              total: resumo.totalGeral,
            }),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Erro ao fazer fechamento"
        );
      }

      /*
       * O backend deve marcar as vendas
       * atuais como fechadas.
       *
       * Por isso fazemos uma nova busca.
       * Elas não devem mais aparecer no DASH.
       */
      await fetchVendas();
      await fetchFechamentos();

      /*
       * Atualiza o LOG também.
       */
      await fetchHistoricoVendas();

      setShowConfirmFechamento(
        false
      );

      setTab(
        "fechamentos"
      );

      showToast(
        data.message ||
          "Fechamento realizado!"
      );
    } catch (error: any) {
      showToast(
        error?.message ||
          "Erro ao fazer fechamento"
      );
    } finally {
      setFazendoFechamento(
        false
      );
    }
  }

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

    try {
      await fetch(
        "/api/produtos?id=" +
          id,
        {
          method: "DELETE",
        }
      );

      await fetchProdutos();

      showToast(
        "Produto removido"
      );
    } catch {
      showToast(
        "Erro ao remover produto"
      );
    }
  }

  async function deletarVenda(
    id: number
  ) {
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
      const response =
        await fetch(
          "/api/vendas?id=" +
            id,
          {
            method: "DELETE",
          }
        );

      if (!response.ok) {
        const data =
          await response
            .json()
            .catch(
              () => ({})
            );

        throw new Error(
          data.error ||
            "Erro ao apagar venda"
        );
      }

      await fetchVendas();
      await fetchHistoricoVendas();
      await fetchProdutos();

      showToast(
        "Venda apagada"
      );
    } catch (error: any) {
      showToast(
        error?.message ||
          "Erro ao apagar venda"
      );
    }
  }

  /*
   * ============================================================
   * RESUMO
   * ============================================================
   */

  function criarResumo(
    listaVendas: Venda[]
  ) {
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

    const semDescricao: DescricaoResumo =
      {
        nome: "Sem descrição",
        total: 0,
        produtos: {},
      };

    listaVendas.forEach(
      (venda) => {
        const itens =
          parseItens(
            venda.itens
          );

        const pagamentoAtual =
          String(
            venda.pagamento ||
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
          venda.total || 0
        );

        const descricaoOriginal =
          String(
            venda.descricao ||
              ""
          ).trim();

        const chaveDescricao =
          normalizarDescricao(
            descricaoOriginal
          );

        let grupo:
          | DescricaoResumo
          | null = null;

        if (chaveDescricao) {
          if (
            !porDescricao[
              chaveDescricao
            ]
          ) {
            porDescricao[
              chaveDescricao
            ] = {
              /*
               * Mostra a primeira forma
               * encontrada.
               */
              nome:
                descricaoOriginal,
              total: 0,
              produtos: {},
            };
          }

          grupo =
            porDescricao[
              chaveDescricao
            ];

          grupo.total += Number(
            venda.total || 0
          );
        } else {
          grupo =
            semDescricao;

          semDescricao.total +=
            Number(
              venda.total || 0
            );
        }

        itens.forEach(
          (item) => {
            const nome =
              String(
                item.nome
              ).trim();

            const qtd =
              Number(
                item.cartQtd
              ) || 0;

            const preco =
              parseFloat(
                item.preco
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
              ].produtos[nome] =
                {
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
              grupo &&
              !grupo.produtos[
                nome
              ]
            ) {
              grupo.produtos[
                nome
              ] = {
                qtd: 0,
                total: 0,
              };
            }

            if (grupo) {
              grupo.produtos[
                nome
              ].qtd += qtd;

              grupo.produtos[
                nome
              ].total += valor;
            }
          }
        );
      }
    );

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
        listaVendas.reduce(
          (sum, venda) =>
            sum +
            Number(
              venda.total || 0
            ),
          0
        ),
    };
  }

  const resumoAtual =
    useMemo(
      () =>
        criarResumo(vendas),
      [vendas]
    );

  const totalCarrinho =
    cart.reduce(
      (sum, item) =>
        sum +
        (parseFloat(
          item.preco
        ) || 0) *
          item.cartQtd,
      0
    );

  const totalQtdCarrinho =
    cart.reduce(
      (sum, item) =>
        sum + item.cartQtd,
      0
    );

  const produtosAtivos =
    produtos.filter(
      (produto) =>
        produto.qtd > 0
    );

  /*
   * ============================================================
   * LOG - PESQUISA
   * ============================================================
   */

  const vendasLogFiltradas =
    useMemo(() => {
      const busca =
        logBusca
          .trim()
          .toLocaleLowerCase(
            "pt-BR"
          );

      if (!busca) {
        return vendasHistorico;
      }

      return vendasHistorico.filter(
        (venda) => {
          const itens =
            parseItens(
              venda.itens
            );

          const nomes =
            itens
              .map(
                (item) =>
                  item.nome
              )
              .join(" ");

          const texto = [
            String(
              venda.id
            ),
            formatarData(
              venda.created_at
            ),
            venda.descricao ||
              "",
            venda.pagamento ||
              "",
            nomes,
          ]
            .join(" ")
            .toLocaleLowerCase(
              "pt-BR"
            );

          return texto.includes(
            busca
          );
        }
      );
    }, [
      vendasHistorico,
      logBusca,
    ]);

  /*
   * ============================================================
   * LOGIN
   * ============================================================
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
                user:
                  e.target.value,
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
                pass:
                  e.target.value,
              })
            }
            onKeyDown={(e) => {
              if (
                e.key === "Enter"
              ) {
                doLogin();
              }
            }}
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

  return (
    <div
      className={
        "min-h-screen flex flex-col items-center overflow-x-hidden " +
        bg
      }
    >
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
      />

      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 bg-zinc-900 text-white px-5 py-3 rounded-full text-sm z-[200] border border-zinc-700 max-w-[90%] text-center">
          {toast}
        </div>
      )}

      <header className="w-full max-w-[1200px] px-5 sm:px-6 py-4 flex justify-between">
        <div className="font-bold">
          Freezer da Amanda
        </div>

        <div className="text-xs opacity-50">
          {vendas.length > 0
            ? `${vendas.length} venda${
                vendas.length !== 1
                  ? "s"
                  : ""
              } em aberto`
            : "Nenhuma venda em aberto"}
        </div>
      </header>

      <main className="w-full max-w-[1200px] flex-1 px-4 sm:px-6 pb-[170px] pt-2">

        {/* ======================================================
            HOME
        ====================================================== */}

        {tab === "home" && (
          <div>
            <h1 className="text-3xl font-bold">
              Home
            </h1>

            <p className="text-xs opacity-60">
              {produtosAtivos.length} produtos
              disponíveis
            </p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
              {produtosAtivos.map(
                (produto) => (
                  <div
                    key={
                      produto.id
                    }
                    className={
                      "rounded-2xl border overflow-hidden " +
                      card
                    }
                  >
                    <img
                      src={
                        produto.imagem
                      }
                      className="w-full h-28 object-contain bg-white p-2"
                    />

                    <div className="p-3">
                      <p className="text-sm font-semibold truncate">
                        {
                          produto.nome
                        }
                      </p>

                      <p className="text-[11px] opacity-50">
                        Estoque:{" "}
                        {
                          produto.qtd
                        }
                      </p>

                      <div className="flex justify-between items-center mt-2 gap-2">
                        <b className="text-sm">
                          R${" "}
                          {
                            produto.preco
                          }
                        </b>

                        <button
                          onClick={() =>
                            addToCart(
                              produto
                            )
                          }
                          className="w-8 h-8 shrink-0 rounded-full bg-[#D6FF57] text-black flex items-center justify-center"
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

        {/* ======================================================
            PDV
        ====================================================== */}

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
                " divide-zinc-800 overflow-hidden"
              }
            >
              {produtos.map(
                (produto) => (
                  <div
                    key={
                      produto.id
                    }
                    className={
                      "p-4 flex gap-3 items-center " +
                      (produto.qtd <=
                      0
                        ? "opacity-40"
                        : "")
                    }
                  >
                    <img
                      src={
                        produto.imagem
                      }
                      className="w-12 h-12 rounded-xl bg-white p-1 object-contain shrink-0"
                    />

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">
                        {
                          produto.nome
                        }{" "}
                        {produto.qtd <=
                          0 &&
                          "(ESGOTADO)"}
                      </p>

                      <p className="text-xs opacity-60">
                        R${" "}
                        {
                          produto.preco
                        }{" "}
                        •{" "}
                        {
                          produto.qtd
                        }{" "}
                        un
                      </p>
                    </div>

                    <button
                      onClick={async () => {
                        const quantidade =
                          prompt(
                            "Nova qtd:",
                            String(
                              produto.qtd
                            )
                          );

                        if (
                          quantidade ===
                          null
                        ) {
                          return;
                        }

                        await fetch(
                          "/api/produtos",
                          {
                            method:
                              "PUT",
                            headers: {
                              "Content-Type":
                                "application/json",
                            },
                            body: JSON.stringify(
                              {
                                id: produto.id,
                                qtd: Number(
                                  quantidade
                                ),
                              }
                            ),
                          }
                        );

                        fetchProdutos();
                      }}
                      className="px-3 py-1 rounded-full bg-zinc-800 text-white text-xs shrink-0"
                    >
                      Editar
                    </button>

                    <button
                      onClick={() =>
                        deletarProduto(
                          produto.id
                        )
                      }
                      className="w-8 h-8 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center shrink-0"
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

        {/* ======================================================
            ADICIONAR
        ====================================================== */}

        {tab === "add" && (
          <div className="max-w-[520px] mx-auto">
            <h1 className="text-3xl font-bold">
              Adicionar
            </h1>

            <p className="text-xs opacity-60">
              Se nome igual, soma no
              estoque.
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

        {/* ======================================================
            DASHBOARD
        ====================================================== */}

        {tab === "dash" && (
          <div className="max-w-[800px] mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
              <div>
                <h1 className="text-3xl font-bold">
                  Dashboard
                </h1>

                <p className="text-xs opacity-60">
                  Ciclo atual • vendas
                  ainda não fechadas
                </p>
              </div>

              {vendas.length >
                0 && (
                <button
                  onClick={() =>
                    setShowConfirmFechamento(
                      true
                    )
                  }
                  className="w-full sm:w-auto px-5 py-3 rounded-xl bg-[#D6FF57] text-black font-bold flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-rounded">
                    task_alt
                  </span>

                  Fazer fechamento
                </button>
              )}
            </div>

            <div className="mt-4 space-y-4">

              {/* FECHAMENTO GERAL */}

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
                  {dinheiro(
                    resumoAtual.totalGeral
                  )}
                </p>

                <p className="text-xs opacity-50 mt-1">
                  {vendas.length} vendas
                  no ciclo atual
                </p>

                <div className="mt-4 space-y-3">
                  {Object.entries(
                    resumoAtual.porPagamento
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
                              {pagamentoAtual ===
                              "pix"
                                ? "qr_code"
                                : pagamentoAtual ===
                                  "dinheiro"
                                ? "payments"
                                : pagamentoAtual ===
                                  "cartao"
                                ? "credit_card"
                                : "receipt_long"}
                            </span>

                            <span className="font-bold uppercase text-sm">
                              {
                                pagamentoAtual
                              }
                            </span>
                          </div>

                          <b className="text-[#D6FF57]">
                            {dinheiro(
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
                                  className="flex justify-between items-center text-xs gap-3"
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span className="font-bold text-[#D6FF57] shrink-0">
                                      {
                                        produto.qtd
                                      }
                                      x
                                    </span>

                                    <span className="truncate">
                                      {
                                        nome
                                      }
                                    </span>
                                  </div>

                                  <span className="opacity-70 shrink-0">
                                    {dinheiro(
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
                    resumoAtual.porPagamento
                  ).length ===
                    0 && (
                    <p className="text-xs opacity-50">
                      Nenhuma venda no
                      ciclo atual.
                    </p>
                  )}
                </div>
              </div>

              {/* DESCRIÇÕES */}

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
                      Eduardo/eduardo são
                      agrupados.
                    </p>
                  </div>

                  <span className="material-symbols-rounded opacity-50">
                    groups
                  </span>
                </div>

                <div className="mt-4 space-y-3">
                  {resumoAtual.porDescricao.map(
                    ([
                      chave,
                      dados,
                    ]) => (
                      <div
                        key={chave}
                        className="rounded-2xl bg-zinc-800 text-white overflow-hidden"
                      >
                        <div className="p-3 flex justify-between items-center border-b border-zinc-700">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-[#D6FF57] text-black flex items-center justify-center shrink-0">
                              <span className="material-symbols-rounded text-[18px]">
                                person
                              </span>
                            </div>

                            <p className="font-bold text-sm">
                              {
                                dados.nome
                              }
                            </p>
                          </div>

                          <b className="text-[#D6FF57]">
                            {dinheiro(
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
                                className="flex justify-between items-center text-xs gap-3"
                              >
                                <span>
                                  <b className="text-[#D6FF57]">
                                    {
                                      produto.qtd
                                    }
                                    x
                                  </b>{" "}
                                  {
                                    nome
                                  }
                                </span>

                                <span className="opacity-70">
                                  {dinheiro(
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

                  {Object.keys(
                    resumoAtual
                      .semDescricao
                      .produtos
                  ).length >
                    0 && (
                    <div className="rounded-2xl bg-zinc-800 text-white overflow-hidden">
                      <div className="p-3 flex justify-between items-center border-b border-zinc-700">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center">
                            <span className="material-symbols-rounded text-[18px]">
                              receipt_long
                            </span>
                          </div>

                          <p className="font-bold text-sm">
                            Sem descrição
                          </p>
                        </div>

                        <b className="text-[#D6FF57]">
                          {dinheiro(
                            resumoAtual
                              .semDescricao
                              .total
                          )}
                        </b>
                      </div>

                      <div className="p-3 space-y-2">
                        {Object.entries(
                          resumoAtual
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
                                  }
                                  x
                                </b>{" "}
                                {
                                  nome
                                }
                              </span>

                              <span className="opacity-70">
                                {dinheiro(
                                  produto.total
                                )}
                              </span>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  )}

                  {resumoAtual.porDescricao
                    .length ===
                    0 &&
                    Object.keys(
                      resumoAtual
                        .semDescricao
                        .produtos
                    ).length ===
                      0 && (
                      <p className="text-xs opacity-50">
                        Nenhuma descrição
                        registrada.
                      </p>
                    )}
                </div>
              </div>

              {/* PRODUTOS */}

              <div
                className={
                  "p-4 rounded-2xl border " +
                  card
                }
              >
                <p className="font-bold">
                  📦 Produtos vendidos
                </p>

                <div className="mt-3 space-y-2 text-sm">
                  {Object.entries(
                    resumoAtual.mapa
                  ).map(
                    ([
                      nome,
                      dados,
                    ]) => (
                      <div
                        key={nome}
                        className="flex justify-between gap-3"
                      >
                        <span>
                          {
                            dados.qtd
                          }
                          x{" "}
                          {nome}
                        </span>

                        <b>
                          {dinheiro(
                            dados.total
                          )}
                        </b>
                      </div>
                    )
                  )}

                  {Object.keys(
                    resumoAtual.mapa
                  ).length ===
                    0 && (
                    <p className="opacity-50">
                      Nenhuma venda.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================
            FECHAMENTOS
        ====================================================== */}

        {tab ===
          "fechamentos" && (
          <div className="max-w-[800px] mx-auto">
            <h1 className="text-3xl font-bold">
              Fechamentos
            </h1>

            <p className="text-xs opacity-60">
              Histórico dos ciclos encerrados
            </p>

            <div className="mt-5 space-y-3">
              {fechamentos.map(
                (
                  fechamento,
                  index
                ) => {
                  const aberto =
                    fechamentoAberto ===
                    fechamento.id;

                  return (
                    <div
                      key={
                        fechamento.id
                      }
                      className={
                        "rounded-2xl border overflow-hidden " +
                        card
                      }
                    >
                      <button
                        onClick={() =>
                          setFechamentoAberto(
                            aberto
                              ? null
                              : fechamento.id
                          )
                        }
                        className="w-full p-4 flex items-center justify-between text-left"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-[#D6FF57] text-black flex items-center justify-center font-bold">
                            #
                            {numeroFechamento(
                              fechamento,
                              index
                            )}
                          </div>

                          <div>
                            <p className="font-bold">
                              #
                              {numeroFechamento(
                                fechamento,
                                index
                              )}{" "}
                              {formatarDataFechamento(
                                fechamento.created_at
                              )}
                            </p>

                            <p className="text-xs opacity-50">
                              Fechamento
                              encerrado
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {fechamento.total !==
                            undefined && (
                            <b>
                              {dinheiro(
                                Number(
                                  fechamento.total
                                )
                              )}
                            </b>
                          )}

                          <span className="material-symbols-rounded">
                            {aberto
                              ? "expand_less"
                              : "expand_more"}
                          </span>
                        </div>
                      </button>

                      {aberto && (
                        <div className="border-t border-zinc-800 p-4">
                          {renderResumoFechamentoSalvo(
                            fechamento,
                            card
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
                    "p-6 rounded-2xl border text-center " +
                    card
                  }
                >
                  <span className="material-symbols-rounded text-4xl opacity-30">
                    receipt_long
                  </span>

                  <p className="mt-2 font-semibold">
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

        {/* ======================================================
            LOG
        ====================================================== */}

        {tab === "log" && (
          <div className="max-w-[800px] mx-auto">
            <h1 className="text-3xl font-bold">
              Log
            </h1>

            <p className="text-xs opacity-60">
              Todas as vendas feitas
            </p>

            <div
              className={
                "mt-4 p-3 rounded-2xl border " +
                card
              }
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
                  className="flex-1 bg-transparent outline-none text-sm min-w-0"
                />
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {vendasLogFiltradas.map(
                (venda) => {
                  const itens =
                    parseItens(
                      venda.itens
                    );

                  return (
                    <div
                      key={
                        venda.id
                      }
                      className={
                        "p-4 rounded-2xl border " +
                        card
                      }
                    >
                      <div className="flex justify-between gap-3">
                        <div>
                          <b>
                            Venda #
                            {
                              venda.id
                            }
                          </b>

                          <p className="text-[11px] opacity-50 mt-1">
                            {formatarData(
                              venda.created_at
                            )}
                          </p>
                        </div>

                        <b>
                          {dinheiro(
                            Number(
                              venda.total
                            )
                          )}
                        </b>
                      </div>

                      <div className="mt-3 space-y-1">
                        {itens.map(
                          (
                            item,
                            itemIndex
                          ) => (
                            <div
                              key={
                                itemIndex
                              }
                              className="flex justify-between text-xs gap-3"
                            >
                              <span>
                                {
                                  item.cartQtd
                                }
                                x{" "}
                                {
                                  item.nome
                                }
                              </span>

                              <span className="opacity-60">
                                {dinheiro(
                                  (parseFloat(
                                    item.preco
                                  ) ||
                                    0) *
                                    item.cartQtd
                                )}
                              </span>
                            </div>
                          )
                        )}
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="text-[10px] px-2 py-1 rounded-full bg-[#D6FF57] text-black uppercase">
                          {
                            venda.pagamento
                          }
                        </span>

                        {venda.fechamento_id && (
                          <span className="text-[10px] px-2 py-1 rounded-full bg-zinc-800">
                            Fechamento #
                            {
                              venda.fechamento_id
                            }
                          </span>
                        )}
                      </div>

                      {venda.descricao && (
                        <div className="mt-2 p-2 rounded-xl bg-zinc-800 text-xs">
                          📝{" "}
                          {
                            venda.descricao
                          }
                        </div>
                      )}

                      <button
                        onClick={() =>
                          deletarVenda(
                            venda.id
                          )
                        }
                        className="mt-3 w-full py-2 rounded-xl bg-red-500/10 text-red-400 text-xs"
                      >
                        Apagar venda
                      </button>
                    </div>
                  );
                }
              )}

              {vendasLogFiltradas.length ===
                0 && (
                <p className="text-center text-xs opacity-50 py-8">
                  Nenhuma venda
                  encontrada.
                </p>
              )}
            </div>
          </div>
        )}

        {/* ======================================================
            CONFIGURAÇÕES
        ====================================================== */}

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

                  setLogged(false);
                }}
                className="w-full py-3 rounded-xl border border-red-500/30 text-red-500"
              >
                Sair
              </button>
            </div>
          </div>
        )}
      </main>

      {/* ========================================================
          CARRINHO
      ======================================================== */}

      {cart.length > 0 && (
        <div
          className={
            "fixed bottom-[108px] left-1/2 -translate-x-1/2 w-[calc(100%-24px)] max-w-[460px] rounded-[24px] p-4 shadow-2xl z-40 border " +
            card
          }
        >
          <div className="flex justify-between items-center mb-3">
            <b className="flex items-center gap-2">
              <span className="material-symbols-rounded">
                shopping_cart
              </span>

              {
                totalQtdCarrinho
              }{" "}
              itens
            </b>

            <b>
              {dinheiro(
                totalCarrinho
              )}
            </b>
          </div>

          <div className="max-h-[140px] overflow-auto space-y-2 mb-3">
            {cart.map(
              (item) => (
                <div
                  key={
                    item.id
                  }
                  className="flex items-center gap-2 bg-zinc-800 rounded-xl p-2 text-white"
                >
                  <img
                    src={
                      item.imagem
                    }
                    className="w-8 h-8 bg-white rounded object-contain shrink-0"
                  />

                  <span className="flex-1 text-xs truncate">
                    {
                      item.nome
                    }
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() =>
                        setCart(
                          (
                            current
                          ) =>
                            current.map(
                              (
                                currentItem
                              ) =>
                                currentItem.id ===
                                item.id
                                  ? {
                                      ...currentItem,
                                      cartQtd:
                                        Math.max(
                                          1,
                                          currentItem.cartQtd -
                                            1
                                        ),
                                    }
                                  : currentItem
                            )
                        )
                      }
                      className="w-7 h-7 rounded-full bg-zinc-700"
                    >
                      -
                    </button>

                    <span className="w-5 text-center text-sm">
                      {
                        item.cartQtd
                      }
                    </span>

                    <button
                      onClick={() => {
                        const estoque =
                          produtos.find(
                            (
                              produto
                            ) =>
                              produto.id ===
                              item.id
                          )?.qtd ||
                          0;

                        if (
                          item.cartQtd >=
                          estoque
                        ) {
                          return showToast(
                            "Estoque: " +
                              estoque
                          );
                        }

                        setCart(
                          (
                            current
                          ) =>
                            current.map(
                              (
                                currentItem
                              ) =>
                                currentItem.id ===
                                item.id
                                  ? {
                                      ...currentItem,
                                      cartQtd:
                                        currentItem.cartQtd +
                                        1,
                                    }
                                  : currentItem
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
                          current
                        ) =>
                          current.filter(
                            (
                              currentItem
                            ) =>
                              currentItem.id !==
                              item.id
                          )
                      )
                    }
                    className="w-7 h-7 rounded-full bg-red-500/20 text-red-400 shrink-0"
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

      {/* ========================================================
          MODAL CHECKOUT
      ======================================================== */}

      {showCheckout && (
        <div className="fixed inset-0 bg-black/70 z-[100] flex items-end md:items-center justify-center p-4">
          <div
            className={
              "w-full max-w-[460px] rounded-[24px] p-6 space-y-4 border max-h-[90vh] overflow-auto " +
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
              {
                totalQtdCarrinho
              }{" "}
              itens •{" "}
              {dinheiro(
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
                (metodo) => (
                  <button
                    key={
                      metodo.id
                    }
                    onClick={() =>
                      setPagamento(
                        metodo.id
                      )
                    }
                    className={
                      "p-3 rounded-xl border flex flex-col items-center gap-1 " +
                      (pagamento ===
                      metodo.id
                        ? "bg-[#D6FF57] text-black border-[#D6FF57]"
                        : "border-zinc-700")
                    }
                  >
                    <span className="material-symbols-rounded">
                      {
                        metodo.icon
                      }
                    </span>

                    <span className="text-[10px] uppercase">
                      {
                        metodo.id
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
                  e.target.value
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
              {dinheiro(
                totalCarrinho
              )}
            </button>
          </div>
        </div>
      )}

      {/* ========================================================
          CONFIRMAÇÃO DO FECHAMENTO
      ======================================================== */}

      {showConfirmFechamento && (
        <div className="fixed inset-0 bg-black/75 z-[150] flex items-center justify-center p-4">
          <div
            className={
              "w-full max-w-[430px] rounded-[24px] p-6 border " +
              card
            }
          >
            <div className="w-14 h-14 rounded-full bg-[#D6FF57] text-black flex items-center justify-center mx-auto">
              <span className="material-symbols-rounded text-3xl">
                task_alt
              </span>
            </div>

            <h2 className="text-xl font-bold text-center mt-4">
              Fazer fechamento?
            </h2>

            <p className="text-sm opacity-60 text-center mt-2">
              O ciclo atual será encerrado.
            </p>

            <div className="mt-4 p-4 rounded-2xl bg-zinc-800 text-white">
              <div className="flex justify-between text-sm">
                <span>
                  Vendas
                </span>

                <b>
                  {
                    vendas.length
                  }
                </b>
              </div>

              <div className="flex justify-between mt-2">
                <span>
                  Total
                </span>

                <b className="text-[#D6FF57]">
                  {dinheiro(
                    resumoAtual.totalGeral
                  )}
                </b>
              </div>
            </div>

            <p className="text-xs opacity-50 text-center mt-4">
              As vendas não serão apagadas.
              Elas ficarão no Log e no
              fechamento histórico.
            </p>

            <div className="grid grid-cols-2 gap-3 mt-5">
              <button
                disabled={
                  fazendoFechamento
                }
                onClick={() =>
                  setShowConfirmFechamento(
                    false
                  )
                }
                className="py-3 rounded-xl border border-zinc-700"
              >
                Cancelar
              </button>

              <button
                disabled={
                  fazendoFechamento
                }
                onClick={
                  fazerFechamento
                }
                className="py-3 rounded-xl bg-[#D6FF57] text-black font-bold"
              >
                {fazendoFechamento
                  ? "Fechando..."
                  : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          NAVEGAÇÃO MOBILE
          
          CORREÇÃO:
          Não existe mais "left: activeIndex * 20%".
          O indicador é colocado dentro do próprio
          botão ativo.
      ======================================================== */}

      <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[calc(100%-20px)] max-w-[520px] z-50">
        <div className="grid grid-cols-5 items-center rounded-[28px] p-2 bg-[#151517] border border-zinc-800 shadow-2xl overflow-hidden">
          {NAV_TABS.map(
            (nav) => {
              const ativo =
                tab === nav.id;

              return (
                <button
                  key={
                    nav.id
                  }
                  onClick={() =>
                    setTab(
                      nav.id
                    )
                  }
                  className={
                    "relative h-[56px] w-full flex items-center justify-center rounded-[22px] transition-all duration-200 " +
                    (ativo
                      ? "bg-[#D6FF57] text-black"
                      : "text-white opacity-50")
                  }
                >
                  <span className="material-symbols-rounded text-[26px]">
                    {
                      nav.icon
                    }
                  </span>
                </button>
              );
            }
          )}
        </div>
      </nav>
    </div>
  );
}

/* ============================================================
   RESUMO SALVO
============================================================ */

function renderResumoFechamentoSalvo(
  fechamento: Fechamento,
  card: string
) {
  const dados =
    fechamento.dados;

  if (!dados) {
    return (
      <p className="text-xs opacity-50">
        Este fechamento não possui
        resumo detalhado salvo.
      </p>
    );
  }

  /*
   * A API pode retornar:
   *
   * dados:
   * {
   *   porPagamento,
   *   porDescricao,
   *   semDescricao,
   *   mapa,
   *   totalGeral
   * }
   */

  const porPagamento =
    dados.porPagamento ||
    {};

  const porDescricao =
    dados.porDescricao ||
    [];

  const semDescricao =
    dados.semDescricao;

  return (
    <div className="space-y-4">
      {dados.totalGeral !==
        undefined && (
        <div>
          <p className="text-xs opacity-50">
            Total
          </p>

          <p className="text-2xl font-bold">
            {dinheiro(
              Number(
                dados.totalGeral
              )
            )}
          </p>
        </div>
      )}

      {Object.entries(
        porPagamento
      ).map(
        ([
          pagamento,
          valor,
        ]: any) => (
          <div
            key={pagamento}
            className="rounded-2xl bg-zinc-800 text-white overflow-hidden"
          >
            <div className="p-3 flex justify-between border-b border-zinc-700">
              <b className="uppercase text-sm">
                {pagamento}
              </b>

              <b className="text-[#D6FF57]">
                {dinheiro(
                  Number(
                    valor.total
                  )
                )}
              </b>
            </div>

            <div className="p-3 space-y-2">
              {Object.entries(
                valor.produtos ||
                  {}
              ).map(
                ([
                  nome,
                  produto,
                ]: any) => (
                  <div
                    key={nome}
                    className="flex justify-between text-xs"
                  >
                    <span>
                      <b className="text-[#D6FF57]">
                        {
                          produto.qtd
                        }
                        x
                      </b>{" "}
                      {nome}
                    </span>

                    <span className="opacity-70">
                      {dinheiro(
                        Number(
                          produto.total
                        )
                      )}
                    </span>
                  </div>
                )
              )}
            </div>
          </div>
        )
      )}

      {porDescricao.length >
        0 && (
        <div>
          <p className="font-bold mb-2">
            Fechamentos por descrição
          </p>

          <div className="space-y-2">
            {porDescricao.map(
              (item: any) => {
                const dadosDescricao =
                  Array.isArray(
                    item
                  )
                    ? item[1]
                    : item;

                return (
                  <div
                    key={
                      dadosDescricao.nome
                    }
                    className="rounded-xl bg-zinc-800 p-3"
                  >
                    <div className="flex justify-between">
                      <b>
                        {
                          dadosDescricao.nome
                        }
                      </b>

                      <b className="text-[#D6FF57]">
                        {dinheiro(
                          Number(
                            dadosDescricao.total
                          )
                        )}
                      </b>
                    </div>

                    <div className="mt-2 space-y-1">
                      {Object.entries(
                        dadosDescricao.produtos ||
                          {}
                      ).map(
                        ([
                          nome,
                          produto,
                        ]: any) => (
                          <div
                            key={
                              nome
                            }
                            className="flex justify-between text-xs"
                          >
                            <span>
                              {
                                produto.qtd
                              }
                              x{" "}
                              {
                                nome
                              }
                            </span>

                            <span>
                              {dinheiro(
                                Number(
                                  produto.total
                                )
                              )}
                            </span>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                );
              }
            )}
          </div>
        </div>
      )}

      {semDescricao &&
        Object.keys(
          semDescricao.produtos ||
            {}
        ).length > 0 && (
          <div className="rounded-xl bg-zinc-800 p-3">
            <div className="flex justify-between">
              <b>
                Sem descrição
              </b>

              <b className="text-[#D6FF57]">
                {dinheiro(
                  Number(
                    semDescricao.total
                  )
                )}
              </b>
            </div>

            <div className="mt-2 space-y-1">
              {Object.entries(
                semDescricao.produtos ||
                  {}
              ).map(
                ([
                  nome,
                  produto,
                ]: any) => (
                  <div
                    key={nome}
                    className="flex justify-between text-xs"
                  >
                    <span>
                      {
                        produto.qtd
                      }
                      x{" "}
                      {
                        nome
                      }
                    </span>

                    <span>
                      {dinheiro(
                        Number(
                          produto.total
                        )
                      )}
                    </span>
                  </div>
                )
              )}
            </div>
          </div>
        )}
    </div>
  );
}

/* ============================================================
   ADICIONAR PRODUTO
============================================================ */

function AddProduto({
  fetchProdutos,
  showToast,
}: {
  fetchProdutos: () => Promise<void>;
  showToast: (
    message: string
  ) => void;
}) {
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
      const response =
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

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Erro banco"
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
    } catch (error: any) {
      showToast(
        error?.message ||
          "Erro ao salvar"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-6 p-6 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-4">
      <div className="grid grid-cols-4 gap-2">
        {GALERIA.map(
          (imagem) => (
            <button
              key={
                imagem.nome
              }
              onClick={() =>
                setForm({
                  ...form,
                  imagem:
                    imagem.url,
                  nome:
                    form.nome ||
                    imagem.nome,
                })
              }
              className={
                "h-20 rounded-xl bg-white p-1 border-2 " +
                (form.imagem ===
                imagem.url
                  ? "border-[#D6FF57]"
                  : "border-transparent")
              }
            >
              <img
                src={
                  imagem.url
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
            {form.nome}
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
              e.target.value,
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
                e.target.value,
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
              qtd:
                e.target.value,
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
          : "Salvar"}
      </button>
    </div>
  );
}