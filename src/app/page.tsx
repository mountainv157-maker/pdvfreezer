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

type Fechamento = {
  id: number;
  data: string;
  total: number;
  totalItens: number;
  vendas: number;
  pagamentos: Record<string, PagamentoResumo>;
  produtos: Record<string, ProdutoResumo>;
  vendaIds: number[];
};

const TABS = [
  { id: "home" as Tab, icon: "home" },
  { id: "pdv" as Tab, icon: "inventory_2" },
  { id: "add" as Tab, icon: "add_box" },
  { id: "dash" as Tab, icon: "monitoring" },
  { id: "fechamentos" as Tab, icon: "receipt_long" },
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

  const [fechamentos, setFechamentos] =
    useState<Fechamento[]>([]);

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

  const afkRef = useRef<any>(null);

  const showToast = (m: string) => {
    setToast(m);

    setTimeout(
      () => setToast(null),
      3000
    );
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

    /*
     * CARREGA FECHAMENTOS
     */
    try {
      const salvos =
        localStorage.getItem(
          "freezer_fechamentos"
        );

      if (salvos) {
        setFechamentos(
          JSON.parse(salvos)
        );
      }
    } catch {
      setFechamentos([]);
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
      clearTimeout(afkRef.current);

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

  const fetchProdutos = () =>
    fetch("/api/produtos")
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d)) {
          setProdutos(d);
        }
      });

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
      showToast(
        "Usuário ou senha incorretos"
      );
    }
  }

  function addToCart(p: Produto) {
    if (p.qtd <= 0) {
      return showToast(
        "Sem estoque"
      );
    }

    setCart((prev) => {
      const ex = prev.find(
        (c) => c.id === p.id
      );

      if (ex) {
        if (
          ex.cartQtd >= p.qtd
        ) {
          showToast(
            "Estoque máximo: " +
              p.qtd
          );

          return prev;
        }

        return prev.map((c) =>
          c.id === p.id
            ? {
                ...c,
                cartQtd:
                  c.cartQtd + 1,
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

      fetchProdutos();
      fetchVendas();

      setTab("dash");

      showToast(
        "Venda salva!"
      );
    } catch (e: any) {
      showToast(
        e.message
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
    )
      return;

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
   * RESUMO DO CICLO ATUAL
   * ==========================================================
   *
   * Somente vendas que ainda NÃO foram fechadas.
   */

  const vendasAbertas =
    vendas.filter(
      (v) =>
        !fechamentos.some(
          (f) =>
            f.vendaIds.includes(
              v.id
            )
        )
    );

  /*
   * ==========================================================
   * RESUMO DO FECHAMENTO
   * ==========================================================
   */

  const resumoFechamento = (
    lista: Venda[] = vendasAbertas
  ) => {
    const mapa: Record<
      string,
      ProdutoResumo
    > = {};

    const porPagamento: Record<
      string,
      PagamentoResumo
    > = {};

    lista.forEach((v) => {
      let itens: CartItem[] = [];

      try {
        itens = JSON.parse(
          v.itens
        );
      } catch {
        itens = [];
      }

      const pagamentoAtual =
        v.pagamento ||
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
        v.total
      );

      itens.forEach((it) => {
        const nome = it.nome;
        const qtd = Number(
          it.cartQtd
        );

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
          ].produtos[nome] = {
            qtd: 0,
            total: 0,
          };
        }

        porPagamento[
          pagamentoAtual
        ].produtos[nome]
          .qtd += qtd;

        porPagamento[
          pagamentoAtual
        ].produtos[nome]
          .total += valor;
      });
    });

    return {
      mapa,
      porPagamento,

      totalGeral:
        lista.reduce(
          (s, v) =>
            s +
            Number(v.total),
          0
        ),

      totalItens:
        lista.reduce(
          (s, v) => {
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

            return (
              s +
              itens.reduce(
                (x, i) =>
                  x +
                  Number(
                    i.cartQtd
                  ),
                0
              )
            );
          },
          0
        ),
    };
  };

  /*
   * ==========================================================
   * FAZER FECHAMENTO
   * ==========================================================
   *
   * Pega somente as vendas abertas e transforma em
   * um fechamento permanente.
   */

  function fazerFechamento() {
    if (
      vendasAbertas.length === 0
    ) {
      showToast(
        "Não existem vendas para fechar."
      );

      return;
    }

    const confirmar =
      confirm(
        "Deseja fazer o fechamento deste ciclo?\n\n" +
          "As vendas atuais serão enviadas para Fechamentos."
      );

    if (!confirmar) return;

    const resumo =
      resumoFechamento(
        vendasAbertas
      );

    const ultimoId =
      fechamentos.length > 0
        ? Math.max(
            ...fechamentos.map(
              (f) => f.id
            )
          )
        : 0;

    const novoFechamento: Fechamento =
      {
        id: ultimoId + 1,

        data:
          new Date().toISOString(),

        total:
          resumo.totalGeral,

        totalItens:
          resumo.totalItens,

        vendas:
          vendasAbertas.length,

        pagamentos:
          resumo.porPagamento,

        produtos:
          resumo.mapa,

        vendaIds:
          vendasAbertas.map(
            (v) => v.id
          ),
      };

    const novaLista = [
      ...fechamentos,
      novoFechamento,
    ];

    setFechamentos(
      novaLista
    );

    localStorage.setItem(
      "freezer_fechamentos",
      JSON.stringify(
        novaLista
      )
    );

    setTab(
      "fechamentos"
    );

    showToast(
      "Fechamento realizado!"
    );
  }

  /*
   * ==========================================================
   * EXCLUIR FECHAMENTO
   * ==========================================================
   */

  function excluirFechamento(
    id: number
  ) {
    if (
      !confirm(
        "Excluir este fechamento?"
      )
    )
      return;

    const novaLista =
      fechamentos.filter(
        (f) =>
          f.id !== id
      );

    setFechamentos(
      novaLista
    );

    localStorage.setItem(
      "freezer_fechamentos",
      JSON.stringify(
        novaLista
      )
    );

    showToast(
      "Fechamento excluído"
    );
  }

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
            value={
              loginForm.pass
            }
            onChange={(e) =>
              setLoginForm({
                ...loginForm,
                pass: e.target.value,
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
        <div className="fixed top-6 left-1/2 -translate-x-1/2 bg-zinc-900 text-white px-5 py-3 rounded-full text-sm z-[100] border border-zinc-700">
          {toast}
        </div>
      )}

      <header className="w-full max-w-[1200px] px-6 py-4 flex justify-between">
        <div className="font-bold">
          Freezer da Amanda
        </div>
      </header>

      <main className="w-full max-w-[1200px] flex-1 px-6 pb-48 pt-2">

        {/* HOME */}

        {tab === "home" && (
          <div>
            <h1 className="text-3xl font-bold">
              Home
            </h1>

            <p className="text-xs opacity-60">
              {produtosAtivos.length} produtos
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

        {/* PDV */}

        {tab === "pdv" && (
          <div className="max-w-[700px] mx-auto">
            <h1 className="text-3xl font-bold">
              PDV - Produtos
            </h1>

            <p className="text-xs opacity-60">
              Adiciona e remove produtos do banco
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
                        {p.preco}{" "}
                        • {p.qtd} un
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

        {/* ADICIONAR */}

        {tab === "add" && (
          <div className="max-w-[520px] mx-auto">
            <h1 className="text-3xl font-bold">
              Adicionar
            </h1>

            <p className="text-xs opacity-60">
              Se nome igual, soma no estoque.
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
                  Ciclo
                </h1>

                <p className="text-xs opacity-60">
                  Acerto / Fechamento
                </p>
              </div>

              {/* BOTÃO PRINCIPAL DO FECHAMENTO */}

              <button
                onClick={
                  fazerFechamento
                }
                disabled={
                  vendasAbertas.length ===
                  0
                }
                className={
                  "px-4 py-3 rounded-xl font-bold flex items-center gap-2 " +
                  (vendasAbertas.length >
                  0
                    ? "bg-[#D6FF57] text-black"
                    : "bg-zinc-800 text-zinc-500")
                }
              >
                <span className="material-symbols-rounded">
                  lock
                </span>

                Fazer fechamento
              </button>

            </div>

            {(() => {
              const {
                mapa,
                porPagamento,
                totalGeral,
                totalItens,
              } =
                resumoFechamento();

              return (
                <div className="mt-4 space-y-4">

                  {/* RESUMO DO CICLO */}

                  <div
                    className={
                      "p-5 rounded-2xl border " +
                      card
                    }
                  >
                    <div className="flex justify-between items-center">

                      <div>
                        <p className="text-xs opacity-50 uppercase">
                          Ciclo atual
                        </p>

                        <p className="text-3xl font-bold mt-1">
                          R${" "}
                          {totalGeral.toFixed(
                            2
                          )}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-xs opacity-50">
                          Itens
                        </p>

                        <p className="font-bold">
                          {totalItens}
                        </p>

                        <p className="text-xs opacity-50 mt-1">
                          Vendas
                        </p>

                        <p className="font-bold">
                          {
                            vendasAbertas.length
                          }
                        </p>
                      </div>

                    </div>
                  </div>

                  {/* PAGAMENTOS */}

                  <div
                    className={
                      "p-4 rounded-2xl border " +
                      card
                    }
                  >
                    <p className="font-bold">
                      💰 Formas de pagamento
                    </p>

                    <div className="mt-3 space-y-2">

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
                            className="flex justify-between items-center p-3 rounded-xl bg-zinc-800 text-white"
                          >
                            <div className="flex items-center gap-2">
                              <span className="material-symbols-rounded">
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

                              <span className="uppercase text-xs font-bold">
                                {
                                  pagamentoAtual
                                }
                              </span>
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
                        )
                      )}

                      {Object.keys(
                        porPagamento
                      ).length ===
                        0 && (
                        <p className="text-xs opacity-50">
                          Nenhuma venda neste ciclo.
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

                    <div className="mt-3 space-y-2">

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
                            className="flex justify-between text-sm"
                          >
                            <span>
                              {d.qtd}x{" "}
                              {nome}
                            </span>

                            <b>
                              R${" "}
                              {d.total.toFixed(
                                2
                              )}
                            </b>
                          </div>
                        )
                      )}

                      {Object.keys(
                        mapa
                      ).length ===
                        0 && (
                        <p className="text-xs opacity-50">
                          Nenhuma venda.
                        </p>
                      )}

                    </div>
                  </div>

                  {/* VENDAS DO CICLO */}

                  <div>

                    <p className="font-bold mb-3">
                      Vendas do ciclo
                    </p>

                    <div className="space-y-3">

                      {vendasAbertas.map(
                        (v) => {
                          let itens: CartItem[] =
                            [];

                          try {
                            itens =
                              JSON.parse(
                                v.itens
                              );
                          } catch {
                            itens =
                              [];
                          }

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
                              <div className="flex justify-between">

                                <b>
                                  #{v.id}{" "}
                                  R${" "}
                                  {Number(
                                    v.total
                                  ).toFixed(
                                    2
                                  )}
                                </b>

                                <span className="text-[10px] px-2 py-1 rounded-full bg-[#D6FF57] text-black uppercase">
                                  {
                                    v.pagamento
                                  }
                                </span>

                              </div>

                              <p className="text-xs opacity-50 mt-1">
                                {new Date(
                                  v.created_at
                                ).toLocaleString(
                                  "pt-BR"
                                )}
                              </p>

                              <p className="text-xs mt-2">
                                {itens
                                  .map(
                                    (
                                      i
                                    ) =>
                                      `${i.cartQtd}x ${i.nome}`
                                  )
                                  .join(
                                    " • "
                                  )}
                              </p>

                              {v.descricao && (
                                <div className="mt-2 text-sm p-2 bg-zinc-800 rounded-lg text-white">
                                  📝{" "}
                                  {
                                    v.descricao
                                  }
                                </div>
                              )}

                            </div>
                          );
                        }
                      )}

                      {vendasAbertas.length ===
                        0 && (
                        <div className="p-8 rounded-2xl border border-dashed border-zinc-700 text-center">
                          <span className="material-symbols-rounded text-4xl opacity-30">
                            task_alt
                          </span>

                          <p className="font-bold mt-2">
                            Ciclo fechado
                          </p>

                          <p className="text-xs opacity-50 mt-1">
                            Faça novas vendas para iniciar outro ciclo.
                          </p>
                        </div>
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

            <h1 className="text-3xl font-bold">
              Fechamentos
            </h1>

            <p className="text-xs opacity-60">
              Histórico dos ciclos encerrados
            </p>

            <div className="mt-5 space-y-4">

              {fechamentos.length ===
                0 && (
                <div
                  className={
                    "p-8 rounded-2xl border text-center " +
                    card
                  }
                >
                  <span className="material-symbols-rounded text-5xl opacity-30">
                    receipt_long
                  </span>

                  <p className="font-bold mt-3">
                    Nenhum fechamento
                  </p>

                  <p className="text-xs opacity-50 mt-1">
                    Os fechamentos realizados aparecerão aqui.
                  </p>
                </div>
              )}

              {[
                ...fechamentos,
              ]
                .reverse()
                .map(
                  (f) => (
                    <div
                      key={f.id}
                      className={
                        "rounded-2xl border overflow-hidden " +
                        card
                      }
                    >

                      {/* CABEÇALHO */}

                      <div className="p-5">

                        <div className="flex justify-between items-start">

                          <div>
                            <p className="text-xs opacity-50">
                              FECHAMENTO
                            </p>

                            <h2 className="text-xl font-bold">
                              #{String(
                                f.id
                              ).padStart(
                                3,
                                "0"
                              )}
                            </h2>

                            <p className="text-xs opacity-50 mt-1">
                              {new Date(
                                f.data
                              ).toLocaleString(
                                "pt-BR"
                              )}
                            </p>
                          </div>

                          <div className="text-right">
                            <p className="text-xs opacity-50">
                              Total
                            </p>

                            <p className="text-2xl font-bold text-[#D6FF57]">
                              R${" "}
                              {f.total.toFixed(
                                2
                              )}
                            </p>

                            <p className="text-xs opacity-50">
                              {f.vendas}{" "}
                              vendas •{" "}
                              {
                                f.totalItens
                              }{" "}
                              itens
                            </p>
                          </div>

                        </div>

                      </div>

                      {/* PAGAMENTOS */}

                      <div className="px-5 pb-4">

                        <p className="text-[10px] uppercase opacity-50 mb-2">
                          Pagamentos
                        </p>

                        <div className="grid grid-cols-2 gap-2">

                          {Object.entries(
                            f.pagamentos
                          ).map(
                            ([
                              nome,
                              dados,
                            ]) => (
                              <div
                                key={
                                  nome
                                }
                                className="p-3 rounded-xl bg-zinc-800 text-white"
                              >
                                <p className="text-[10px] uppercase opacity-50">
                                  {
                                    nome
                                  }
                                </p>

                                <p className="font-bold text-[#D6FF57]">
                                  R${" "}
                                  {dados.total.toFixed(
                                    2
                                  )}
                                </p>
                              </div>
                            )
                          )}

                        </div>

                      </div>

                      {/* PRODUTOS */}

                      <div className="border-t border-zinc-800 p-5">

                        <p className="text-[10px] uppercase opacity-50 mb-3">
                          Produtos vendidos
                        </p>

                        <div className="space-y-2">

                          {Object.entries(
                            f.produtos
                          ).map(
                            ([
                              nome,
                              produto,
                            ]) => (
                              <div
                                key={
                                  nome
                                }
                                className="flex justify-between text-sm"
                              >
                                <span>
                                  <b className="text-[#D6FF57]">
                                    {
                                      produto.qtd
                                    }x
                                  </b>{" "}
                                  {nome}
                                </span>

                                <span>
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

                      {/* RODAPÉ */}

                      <div className="p-4 border-t border-zinc-800 flex justify-between items-center">

                        <span className="text-xs opacity-40">
                          Ciclo encerrado
                        </span>

                        <button
                          onClick={() =>
                            excluirFechamento(
                              f.id
                            )
                          }
                          className="px-3 py-2 rounded-xl bg-red-500/10 text-red-400 text-xs"
                        >
                          Excluir
                        </button>

                      </div>

                    </div>
                  )
                )}

            </div>

          </div>
        )}

        {/* CONFIGURAÇÕES */}

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

      {/* =====================================================
          CARRINHO
      ===================================================== */}

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
              {total.toFixed(
                2
              )}
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

      {/* =====================================================
          CHECKOUT
      ===================================================== */}

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
              {totalQtd} itens • R${" "}
              {total.toFixed(
                2
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
                      {m.icon}
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
              Confirmar R${" "}
              {total.toFixed(
                2
              )}
            </button>

          </div>

        </div>
      )}

      {/* =====================================================
          NAVEGAÇÃO
      ===================================================== */}

      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[96%] max-w-[520px]">

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
                100 /
                  TABS.length -
                4 +
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
                key={
                  t.id
                }
                onClick={() =>
                  setTab(
                    t.id
                  )
                }
                className={
                  "relative z-10 flex-1 h-[56px] flex items-center justify-center " +
                  (tab ===
                  t.id
                    ? "opacity-0"
                    : "opacity-50 text-white")
                }
              >

                <span className="material-symbols-rounded text-[26px]">
                  {t.icon}
                </span>

              </button>
            )
          )}

        </div>

      </div>

    </div>
  );
}

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
            body: JSON.stringify(
              {
                nome: form.nome,
                preco:
                  form.preco,
                qtd: parseInt(
                  form.qtd ||
                    "0"
                ),
                imagem:
                  form.imagem,
              }
            ),
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
            nome: e.target.value,
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