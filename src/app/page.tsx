"use client";

import { useState, useEffect, useRef } from "react";

type Tab =
  | "home"
  | "pdv"
  | "add"
  | "dash"
  | "fechamentos"
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

const TABS = [
  { id: "home" as Tab, icon: "home" },
  { id: "pdv" as Tab, icon: "inventory_2" },
  { id: "add" as Tab, icon: "add_box" },
  { id: "dash" as Tab, icon: "monitoring" },
  { id: "fechamentos" as Tab, icon: "calendar_month" },
  { id: "settings" as Tab, icon: "settings" },
];

const GALERIA = [
  { nome: "Coca-Cola 2L", url: "/img/coca2lt.png" },
  { nome: "Coca Lata 350ml", url: "/img/cocalata.png" },
  { nome: "Coca Zero Lata 350ml", url: "/img/cocalatazero.png" },
  { nome: "Fanta Laranja 2L", url: "/img/fanta2lt.png" },
  { nome: "Fanta Lata", url: "/img/fantalata.png" },
  { nome: "Guaraná 2L", url: "/img/guarana2lt.png" },
  { nome: "Guaraná Lata", url: "/img/guaranalata.png" },
  { nome: "Guaraná Lata Zero", url: "/img/guaranalatazero.png" },
  { nome: "Água 500ml", url: "/img/agua.png" },
];

export default function App() {
  const [logged, setLogged] = useState(false);

  const [loginForm, setLoginForm] = useState({
    user: "",
    pass: "",
  });

  const [tab, setTab] = useState<Tab>("home");

  const [dark, setDark] = useState(true);

  const [produtos, setProdutos] = useState<Produto[]>([]);

  const [cart, setCart] = useState<CartItem[]>([]);

  const [vendas, setVendas] = useState<Venda[]>([]);

  const [pagamento, setPagamento] = useState("pix");

  const [descricao, setDescricao] = useState("");

  const [showCheckout, setShowCheckout] = useState(false);

  const [toast, setToast] = useState<string | null>(null);

  const [savedPass, setSavedPass] =
    useState("pdvadmin123");

  const [newPass, setNewPass] = useState("");

  /*
   * Mês atualmente aberto no relatório.
   *
   * Exemplo:
   * "2026-08"
   */
  const [mesSelecionado, setMesSelecionado] =
    useState<string | null>(null);

  const afkRef = useRef<any>(null);

  const showToast = (m: string) => {
    setToast(m);

    setTimeout(() => {
      setToast(null);
    }, 3000);
  };

  /*
   * ==========================================================
   * INICIALIZAÇÃO
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
      localStorage.getItem("theme") ===
      "light"
    ) {
      setDark(false);
    }
  }, []);

  /*
   * ==========================================================
   * TEMA
   * ==========================================================
   */

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
      clearTimeout(afkRef.current);

      afkRef.current = setTimeout(() => {
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
      window.addEventListener(e, reset)
    );

    reset();

    return () => {
      [
        "mousemove",
        "keydown",
        "touchstart",
        "click",
      ].forEach((e) =>
        window.removeEventListener(e, reset)
      );

      clearTimeout(afkRef.current);
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
      });

  useEffect(() => {
    if (logged) {
      fetchProdutos();
      fetchVendas();
    }
  }, [logged, tab]);

  /*
   * ==========================================================
   * LOGIN
   * ==========================================================
   */

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
    } else {
      showToast("Usuário ou senha incorretos");
    }
  }

  /*
   * ==========================================================
   * CARRINHO
   * ==========================================================
   */

  function addToCart(p: Produto) {
    if (p.qtd <= 0) {
      return showToast("Sem estoque");
    }

    setCart((prev) => {
      const ex = prev.find(
        (c) => c.id === p.id
      );

      if (ex) {
        if (ex.cartQtd >= p.qtd) {
          showToast(
            "Estoque máximo: " + p.qtd
          );

          return prev;
        }

        return prev.map((c) =>
          c.id === p.id
            ? {
                ...c,
                cartQtd: c.cartQtd + 1,
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
    const total = cart.reduce(
      (s, i) =>
        s +
        parseFloat(i.preco) *
          i.cartQtd,
      0
    );

    try {
      const r = await fetch(
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

      const data = await r.json();

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

      setTab("dash");

      showToast("Venda salva!");
    } catch (e: any) {
      showToast(e.message);
    }
  }

  /*
   * ==========================================================
   * EXCLUIR PRODUTO
   * ==========================================================
   */

  async function deletarProduto(
    id: number
  ) {
    if (
      !confirm(
        "Remover do freezer?"
      )
    )
      return;

    await fetch(
      "/api/produtos?id=" + id,
      {
        method: "DELETE",
      }
    );

    fetchProdutos();
  }

  /*
   * ==========================================================
   * TOTAIS DO CARRINHO
   * ==========================================================
   */

  const total = cart.reduce(
    (s, i) =>
      s +
      parseFloat(i.preco) *
        i.cartQtd,
    0
  );

  const totalQtd = cart.reduce(
    (s, i) =>
      s + i.cartQtd,
    0
  );

  const activeIndex =
    TABS.findIndex(
      (t) => t.id === tab
    );

  const produtosAtivos =
    produtos.filter(
      (p) => p.qtd > 0
    );

  /*
   * ==========================================================
   * CONVERTER DATA
   * ==========================================================
   */

  function getDataVenda(
    venda: Venda
  ) {
    const data = new Date(
      venda.created_at
    );

    return data;
  }

  /*
   * ==========================================================
   * CHAVE DO MÊS
   *
   * Retorna:
   *
   * 2026-08
   * 2026-07
   * etc.
   * ==========================================================
   */

  function getMesKey(
    venda: Venda
  ) {
    const data =
      getDataVenda(venda);

    const ano =
      data.getFullYear();

    const mes =
      String(
        data.getMonth() + 1
      ).padStart(2, "0");

    return `${ano}-${mes}`;
  }

  /*
   * ==========================================================
   * NOME DO MÊS
   * ==========================================================
   */

  function getNomeMes(
    chave: string
  ) {
    const [ano, mes] =
      chave.split("-");

    const data = new Date(
      Number(ano),
      Number(mes) - 1,
      1
    );

    return data.toLocaleDateString(
      "pt-BR",
      {
        month: "long",
        year: "numeric",
      }
    );
  }

  /*
   * ==========================================================
   * VENDAS SEPARADAS POR MÊS
   * ==========================================================
   */

  const vendasPorMes =
    vendas.reduce(
      (
        grupos: Record<
          string,
          Venda[]
        >,
        venda
      ) => {
        const chave =
          getMesKey(venda);

        if (!grupos[chave]) {
          grupos[chave] = [];
        }

        grupos[chave].push(venda);

        return grupos;
      },
      {}
    );

  /*
   * Ordena os meses do mais recente
   * para o mais antigo.
   */

  const mesesDisponiveis =
    Object.keys(
      vendasPorMes
    ).sort((a, b) =>
      b.localeCompare(a)
    );

  /*
   * ==========================================================
   * RESUMO DO FECHAMENTO
   * ==========================================================
   */

  function calcularResumo(
    vendasDoPeriodo: Venda[]
  ) {
    const mapa: Record<
      string,
      ProdutoResumo
    > = {};

    const porPagamento: Record<
      string,
      PagamentoResumo
    > = {};

    vendasDoPeriodo.forEach(
      (venda) => {
        let itens: CartItem[] = [];

        try {
          itens = JSON.parse(
            venda.itens
          );
        } catch {
          itens = [];
        }

        const pagamentoAtual =
          venda.pagamento ||
          "outro";

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
          venda.total
        );

        itens.forEach((item) => {
          const nome = item.nome;

          const qtd =
            Number(
              item.cartQtd
            );

          const preco =
            parseFloat(
              item.preco
            ) || 0;

          const valor =
            preco * qtd;

          /*
           * RESUMO GERAL
           */

          if (!mapa[nome]) {
            mapa[nome] = {
              qtd: 0,
              total: 0,
            };
          }

          mapa[nome].qtd += qtd;
          mapa[nome].total += valor;

          /*
           * PRODUTOS POR PAGAMENTO
           */

          if (
            !porPagamento[
              pagamentoAtual
            ].produtos[nome]
          ) {
            porPagamento[
              pagamentoAtual
            ].produtos[nome] = {
              qtd: 0,
              total: 0,
            };
          }

          porPagamento[
            pagamentoAtual
          ].produtos[nome].qtd +=
            qtd;

          porPagamento[
            pagamentoAtual
          ].produtos[nome].total +=
            valor;
        });
      }
    );

    return {
      mapa,
      porPagamento,
      totalGeral:
        vendasDoPeriodo.reduce(
          (s, v) =>
            s + Number(v.total),
          0
        ),
      quantidadeVendas:
        vendasDoPeriodo.length,
    };
  }

  /*
   * ==========================================================
   * ÍCONE DO PAGAMENTO
   * ==========================================================
   */

  function getPagamentoIcon(
    pagamentoAtual: string
  ) {
    if (
      pagamentoAtual ===
      "pix"
    )
      return "qr_code";

    if (
      pagamentoAtual ===
      "dinheiro"
    )
      return "payments";

    if (
      pagamentoAtual ===
      "cartao"
    )
      return "credit_card";

    return "receipt_long";
  }

  /*
   * ==========================================================
   * TELA DE LOGIN
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
            value={loginForm.user}
            onChange={(e) =>
              setLoginForm({
                ...loginForm,
                user: e.target.value,
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
            value={loginForm.pass}
            onChange={(e) =>
              setLoginForm({
                ...loginForm,
                pass: e.target.value,
              })
            }
            onKeyDown={(e) =>
              e.key === "Enter" &&
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

  /*
   * ==========================================================
   * RELATÓRIO DO MÊS SELECIONADO
   * ==========================================================
   */

  const vendasMesSelecionado =
    mesSelecionado
      ? vendasPorMes[
          mesSelecionado
        ] || []
      : [];

  const resumoMes =
    mesSelecionado
      ? calcularResumo(
          vendasMesSelecionado
        )
      : null;

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
        <div className="fixed top-6 left-1/2 -translate-x-1/2 bg-zinc-900 text-white px-5 py-3 rounded-full text-sm z-[200] border border-zinc-700">
          {toast}
        </div>
      )}

      <header className="w-full max-w-[1200px] px-6 py-4 flex justify-between">
        <div className="font-bold">
          Freezer da Amanda
        </div>

        <div className="text-xs opacity-50">
          {tab ===
            "fechamentos" &&
            mesSelecionado
            ? "Relatório mensal"
            : ""}
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
                          R${" "}
                          {p.preco}
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
                      (p.qtd <=
                      0
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
                        {p.preco}{" "}
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
                            headers: {
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

        {/* =====================================================
            DASHBOARD
        ===================================================== */}

        {tab === "dash" && (
          <div className="max-w-[700px] mx-auto">
            <h1 className="text-3xl font-bold">
              Dashboard
            </h1>

            <p className="text-xs opacity-60 mt-1">
              Visão rápida das vendas
            </p>

            <div className="grid grid-cols-2 gap-3 mt-5">

              <div
                className={
                  "p-5 rounded-2xl border " +
                  card
                }
              >
                <span className="material-symbols-rounded opacity-60">
                  point_of_sale
                </span>

                <p className="text-xs opacity-60 mt-3">
                  Total vendido
                </p>

                <p className="text-2xl font-bold mt-1">
                  R${" "}
                  {vendas
                    .reduce(
                      (s, v) =>
                        s +
                        Number(
                          v.total
                        ),
                      0
                    )
                    .toFixed(2)}
                </p>
              </div>

              <div
                className={
                  "p-5 rounded-2xl border " +
                  card
                }
              >
                <span className="material-symbols-rounded opacity-60">
                  receipt_long
                </span>

                <p className="text-xs opacity-60 mt-3">
                  Vendas
                </p>

                <p className="text-2xl font-bold mt-1">
                  {vendas.length}
                </p>
              </div>

            </div>

            <div
              className={
                "mt-4 p-5 rounded-2xl border " +
                card
              }
            >
              <p className="font-bold">
                📅 Fechamentos
              </p>

              <p className="text-xs opacity-60 mt-1">
                Acesse a aba de
                fechamentos para
                consultar os relatórios
                mensais.
              </p>

              <button
                onClick={() => {
                  setMesSelecionado(
                    null
                  );
                  setTab(
                    "fechamentos"
                  );
                }}
                className="mt-4 w-full py-3 rounded-xl bg-[#D6FF57] text-black font-bold"
              >
                Abrir Fechamentos
              </button>
            </div>
          </div>
        )}

        {/* =====================================================
            FECHAMENTOS
        ===================================================== */}

        {tab ===
          "fechamentos" && (
          <div className="max-w-[700px] mx-auto">

            {/* =================================================
                LISTA DE MESES
            ================================================= */}

            {!mesSelecionado && (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-3xl font-bold">
                      Fechamentos
                    </h1>

                    <p className="text-xs opacity-60 mt-1">
                      Relatórios mensais
                    </p>
                  </div>

                  <span className="material-symbols-rounded text-3xl opacity-50">
                    calendar_month
                  </span>
                </div>

                {mesesDisponiveis.length ===
                  0 ? (
                  <div
                    className={
                      "mt-6 p-6 rounded-2xl border text-center " +
                      card
                    }
                  >
                    <span className="material-symbols-rounded text-5xl opacity-30">
                      event_busy
                    </span>

                    <p className="font-bold mt-3">
                      Nenhum fechamento
                    </p>

                    <p className="text-xs opacity-60 mt-1">
                      Quando houver
                      vendas, os meses
                      aparecerão aqui.
                    </p>
                  </div>
                ) : (
                  <div className="mt-5 space-y-3">

                    {mesesDisponiveis.map(
                      (mes) => {
                        const vendasDoMes =
                          vendasPorMes[
                            mes
                          ] || [];

                        const resumo =
                          calcularResumo(
                            vendasDoMes
                          );

                        return (
                          <button
                            key={mes}
                            onClick={() =>
                              setMesSelecionado(
                                mes
                              )
                            }
                            className={
                              "w-full text-left p-5 rounded-2xl border transition active:scale-[0.98] " +
                              card
                            }
                          >
                            <div className="flex items-center justify-between">

                              <div className="flex items-center gap-4">

                                <div className="w-12 h-12 rounded-2xl bg-[#D6FF57] text-black flex items-center justify-center">
                                  <span className="material-symbols-rounded">
                                    calendar_month
                                  </span>
                                </div>

                                <div>
                                  <p className="font-bold capitalize">
                                    {getNomeMes(
                                      mes
                                    )}
                                  </p>

                                  <p className="text-xs opacity-60 mt-1">
                                    {
                                      resumo.quantidadeVendas
                                    }{" "}
                                    venda
                                    {resumo.quantidadeVendas !==
                                    1
                                      ? "s"
                                      : ""}
                                  </p>
                                </div>

                              </div>

                              <div className="text-right">

                                <p className="font-bold">
                                  R${" "}
                                  {resumo.totalGeral.toFixed(
                                    2
                                  )}
                                </p>

                                <span className="material-symbols-rounded opacity-40 mt-1">
                                  chevron_right
                                </span>

                              </div>

                            </div>
                          </button>
                        );
                      }
                    )}

                  </div>
                )}
              </>
            )}

            {/* =================================================
                RELATÓRIO DO MÊS
            ================================================= */}

            {mesSelecionado &&
              resumoMes && (
                <div>

                  {/* CABEÇALHO */}

                  <button
                    onClick={() =>
                      setMesSelecionado(
                        null
                      )
                    }
                    className="flex items-center gap-2 text-sm opacity-70 hover:opacity-100 mb-5"
                  >
                    <span className="material-symbols-rounded">
                      arrow_back
                    </span>

                    Voltar para Fechamentos
                  </button>

                  <div className="flex justify-between items-start">

                    <div>
                      <p className="text-xs uppercase opacity-50">
                        Fechamento mensal
                      </p>

                      <h1 className="text-3xl font-bold capitalize mt-1">
                        {getNomeMes(
                          mesSelecionado
                        )}
                      </h1>
                    </div>

                    <div className="w-12 h-12 rounded-2xl bg-[#D6FF57] text-black flex items-center justify-center">
                      <span className="material-symbols-rounded">
                        lock
                      </span>
                    </div>

                  </div>

                  {/* TOTAL GERAL */}

                  <div
                    className={
                      "mt-5 p-6 rounded-2xl border " +
                      card
                    }
                  >
                    <p className="text-xs uppercase opacity-50">
                      Total do mês
                    </p>

                    <p className="text-4xl font-bold mt-2">
                      R${" "}
                      {resumoMes.totalGeral.toFixed(
                        2
                      )}
                    </p>

                    <div className="grid grid-cols-2 gap-3 mt-5">

                      <div className="p-3 rounded-xl bg-zinc-800/60">
                        <p className="text-[10px] uppercase opacity-50">
                          Vendas
                        </p>

                        <p className="font-bold mt-1">
                          {
                            resumoMes.quantidadeVendas
                          }
                        </p>
                      </div>

                      <div className="p-3 rounded-xl bg-zinc-800/60">
                        <p className="text-[10px] uppercase opacity-50">
                          Produtos
                        </p>

                        <p className="font-bold mt-1">
                          {Object.values(
                            resumoMes.mapa
                          ).reduce(
                            (s, p) =>
                              s +
                              p.qtd,
                            0
                          )}
                        </p>
                      </div>

                    </div>
                  </div>

                  {/* =================================================
                      FORMAS DE PAGAMENTO
                  ================================================= */}

                  <div className="mt-4">

                    <h2 className="font-bold text-lg">
                      💳 Formas de pagamento
                    </h2>

                    <div className="mt-3 space-y-3">

                      {Object.entries(
                        resumoMes.porPagamento
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

                            <div className="p-4 flex justify-between items-center border-b border-zinc-700">

                              <div className="flex items-center gap-3">

                                <div className="w-10 h-10 rounded-xl bg-zinc-700 flex items-center justify-center">
                                  <span className="material-symbols-rounded">
                                    {getPagamentoIcon(
                                      pagamentoAtual
                                    )}
                                  </span>
                                </div>

                                <div>
                                  <p className="font-bold uppercase text-sm">
                                    {
                                      pagamentoAtual
                                    }
                                  </p>

                                  <p className="text-[10px] opacity-50">
                                    {Object.values(
                                      dados.produtos
                                    ).reduce(
                                      (
                                        s,
                                        p
                                      ) =>
                                        s +
                                        p.qtd,
                                      0
                                    )}{" "}
                                    produtos
                                  </p>
                                </div>

                              </div>

                              <b className="text-[#D6FF57]">
                                R${" "}
                                {Number(
                                  dados.total
                                ).toFixed(
                                  2
                                )}
                              </b>

                            </div>

                            {/* PRODUTOS */}

                            <div className="p-4">

                              <p className="text-[10px] uppercase opacity-40 mb-3">
                                Produtos vendidos
                              </p>

                              <div className="space-y-3">

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
                                      className="flex justify-between items-center"
                                    >

                                      <div className="flex items-center gap-2">

                                        <span className="font-bold text-[#D6FF57]">
                                          {
                                            produto.qtd
                                          }x
                                        </span>

                                        <span className="text-xs">
                                          {
                                            nome
                                          }
                                        </span>

                                      </div>

                                      <span className="text-xs opacity-70">
                                        R${" "}
                                        {produto.total.toFixed(
                                          2
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

                    </div>
                  </div>

                  {/* =================================================
                      PRODUTOS GERAIS
                  ================================================= */}

                  <div
                    className={
                      "mt-4 p-5 rounded-2xl border " +
                      card
                    }
                  >

                    <p className="font-bold">
                      📦 Produtos vendidos
                    </p>

                    <div className="mt-4 space-y-3">

                      {Object.entries(
                        resumoMes.mapa
                      ).map(
                        ([
                          nome,
                          dados,
                        ]) => (
                          <div
                            key={nome}
                            className="flex justify-between items-center p-3 rounded-xl bg-zinc-800/60"
                          >

                            <div>
                              <p className="text-sm font-semibold">
                                {nome}
                              </p>

                              <p className="text-xs opacity-50 mt-1">
                                {
                                  dados.qtd
                                }{" "}
                                unidades
                              </p>
                            </div>

                            <b>
                              R${" "}
                              {dados.total.toFixed(
                                2
                              )}
                            </b>

                          </div>
                        )
                      )}

                      {Object.keys(
                        resumoMes.mapa
                      ).length ===
                        0 && (
                        <p className="text-xs opacity-60">
                          Nenhum produto
                          vendido.
                        </p>
                      )}

                    </div>
                  </div>

                  {/* =================================================
                      HISTÓRICO DO MÊS
                  ================================================= */}

                  <div className="mt-5">

                    <div className="flex justify-between items-center">

                      <h2 className="font-bold text-lg">
                        🧾 Vendas do mês
                      </h2>

                      <span className="text-xs opacity-50">
                        {
                          vendasMesSelecionado.length
                        }{" "}
                        registros
                      </span>

                    </div>

                    <div className="mt-3 space-y-3">

                      {vendasMesSelecionado
                        .slice()
                        .sort(
                          (
                            a,
                            b
                          ) =>
                            new Date(
                              b.created_at
                            ).getTime() -
                            new Date(
                              a.created_at
                            ).getTime()
                        )
                        .map(
                          (venda) => {
                            let itens: CartItem[] =
                              [];

                            try {
                              itens =
                                JSON.parse(
                                  venda.itens
                                );
                            } catch {
                              itens =
                                [];
                            }

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

                                <div className="flex justify-between items-center">

                                  <div>
                                    <b>
                                      Venda #
                                      {
                                        venda.id
                                      }
                                    </b>

                                    <p className="text-[10px] opacity-50 mt-1">
                                      {new Date(
                                        venda.created_at
                                      ).toLocaleString(
                                        "pt-BR"
                                      )}
                                    </p>
                                  </div>

                                  <div className="flex items-center gap-2">

                                    <span className="text-[10px] px-2 py-1 rounded-full bg-[#D6FF57] text-black uppercase">
                                      {
                                        venda.pagamento
                                      }
                                    </span>

                                    <button
                                      onClick={async () => {
                                        if (
                                          !confirm(
                                            "Apagar venda #" +
                                              venda.id +
                                              "? O estoque vai voltar."
                                          )
                                        )
                                          return;

                                        const r =
                                          await fetch(
                                            "/api/vendas?id=" +
                                              venda.id,
                                            {
                                              method:
                                                "DELETE",
                                            }
                                          );

                                        if (
                                          !r.ok
                                        ) {
                                          showToast(
                                            "Erro ao apagar venda"
                                          );
                                          return;
                                        }

                                        await fetchVendas();
                                        await fetchProdutos();

                                        showToast(
                                          "Venda apagada"
                                        );
                                      }}
                                      className="w-7 h-7 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center"
                                    >
                                      <span className="material-symbols-rounded text-[16px]">
                                        delete
                                      </span>
                                    </button>

                                  </div>

                                </div>

                                {/* PRODUTOS DA VENDA */}

                                <div className="mt-3 space-y-2">

                                  {itens.map(
                                    (
                                      item
                                    ) => (
                                      <div
                                        key={
                                          item.id
                                        }
                                        className="flex justify-between text-xs"
                                      >

                                        <span>
                                          {
                                            item.cartQtd
                                          }x{" "}
                                          {
                                            item.nome
                                          }
                                        </span>

                                        <span>
                                          R${" "}
                                          {(
                                            parseFloat(
                                              item.preco
                                            ) *
                                            item.cartQtd
                                          ).toFixed(
                                            2
                                          )}
                                        </span>

                                      </div>
                                    )
                                  )}

                                </div>

                                <div className="border-t border-zinc-800 mt-3 pt-3 flex justify-between">

                                  <span className="text-xs opacity-50">
                                    Total
                                  </span>

                                  <b>
                                    R${" "}
                                    {Number(
                                      venda.total
                                    ).toFixed(
                                      2
                                    )}
                                  </b>

                                </div>

                                {venda.descricao && (
                                  <div className="mt-3 text-xs p-3 bg-zinc-800 rounded-xl text-white">
                                    📝{" "}
                                    {
                                      venda.descricao
                                    }
                                  </div>
                                )}

                              </div>
                            );
                          }
                        )}

                    </div>
                  </div>

                </div>
              )}

          </div>
        )}

        {/* =====================================================
            CONFIGURAÇÕES
        ===================================================== */}

        {tab === "settings" && (
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
                    setDark(!dark)
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

              <div
                className={
                  "p-4 rounded-xl " +
                  (dark
                    ? "bg-zinc-800"
                    : "bg-zinc-100")
                }
              >
                {/*
                  Área reservada para senha
                  salva no banco.
                */}
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

              {totalQtd} itens

            </b>

            <b>
              R${" "}
              {total.toFixed(2)}
            </b>

          </div>

          <div className="max-h-[140px] overflow-auto space-y-2 mb-3">

            {cart.map(
              (i) => (
                <div
                  key={i.id}
                  className="flex items-center gap-2 bg-zinc-800 rounded-xl p-2 text-white"
                >

                  <img
                    src={i.imagem}
                    className="w-8 h-8 bg-white rounded object-contain"
                  />

                  <span className="flex-1 text-xs truncate">
                    {i.nome}
                  </span>

                  <div className="flex items-center gap-1">

                    <button
                      onClick={() =>
                        setCart(
                          (c) =>
                            c.map(
                              (x) =>
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
                            (p) =>
                              p.id ===
                              i.id
                          )?.qtd ||
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
                          (c) =>
                            c.map(
                              (x) =>
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
                        (c) =>
                          c.filter(
                            (x) =>
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

            {/* RESUMO DOS PRODUTOS */}

            <div className="rounded-xl bg-zinc-800 p-3 text-white">

              <p className="text-[10px] uppercase opacity-50 mb-2">
                Produtos
              </p>

              <div className="space-y-2">

                {cart.map(
                  (item) => (
                    <div
                      key={
                        item.id
                      }
                      className="flex justify-between text-xs"
                    >
                      <span>
                        {
                          item.cartQtd
                        }x{" "}
                        {
                          item.nome
                        }
                      </span>

                      <span>
                        R${" "}
                        {(
                          parseFloat(
                            item.preco
                          ) *
                          item.cartQtd
                        ).toFixed(
                          2
                        )}
                      </span>
                    </div>
                  )
                )}

              </div>

            </div>

            <p className="text-sm opacity-60">
              {totalQtd} itens • R${" "}
              {total.toFixed(2)}
            </p>

            {/* PAGAMENTO */}

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
                      {m.id}
                    </span>

                  </button>
                )
              )}

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
              onClick={
                finalizarVenda
              }
              className="w-full py-4 rounded-xl bg-[#D6FF57] text-black font-bold"
            >
              Confirmar R${" "}
              {total.toFixed(2)}
            </button>

          </div>
        </div>
      )}

      {/* =======================================================
          NAVEGAÇÃO INFERIOR
      ======================================================= */}

      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[96%] max-w-[560px]">

        <div className="relative rounded-[28px] p-2 flex justify-between items-center bg-[#151517] border border-zinc-800 shadow-2xl">

          <div
            className="absolute top-1/2 -translate-y-1/2 transition-all duration-500"
            style={{
              left:
                activeIndex *
                  (100 /
                    TABS.length) +
                2 +
                "%",
              width:
                16 +
                "%",
            }}
          >

            <div className="w-[56px] h-[56px] mx-auto rounded-full flex items-center justify-center bg-[#D6FF57]">

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
                key={t.id}
                onClick={() => {
                  setTab(
                    t.id
                  );

                  if (
                    t.id !==
                    "fechamentos"
                  ) {
                    setMesSelecionado(
                      null
                    );
                  }
                }}
                className={
                  "relative z-10 w-[56px] h-[56px] flex items-center justify-center " +
                  (tab ===
                  t.id
                    ? "opacity-0"
                    : "opacity-50 text-white")
                }
              >

                <span className="material-symbols-rounded text-[26px]">
                  {
                    t.icon
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
 * ============================================================
 * COMPONENTE ADICIONAR PRODUTO
 * ============================================================
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
            imagem:
              form.imagem,
          }),
        }
      );

      if (!r.ok) {
        throw new Error(
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
                src={img.url}
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
        onClick={
          save
        }
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