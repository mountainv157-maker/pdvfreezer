import { NextResponse } from "next/server";
import { createClient } from "@libsql/client";

const getDb = () => createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!
});

export async function GET(){
  const db = getDb();
  await db.execute(`CREATE TABLE IF NOT EXISTS vendas (id INTEGER PRIMARY KEY AUTOINCREMENT, itens TEXT, total REAL, pagamento TEXT, descricao TEXT, created_at TEXT DEFAULT (datetime('now','localtime')))`);
  const r = await db.execute("SELECT * FROM vendas ORDER BY id DESC");
  return NextResponse.json(r.rows);
}

export async function POST(req: Request){
  const db = getDb();
  const {itens, total, pagamento, descricao} = await req.json();

  for(const it of itens){
    const p = await db.execute({ sql: "SELECT qtd FROM produtos WHERE id=?", args: [it.id] });
    if(p.rows.length===0) return NextResponse.json({error:"Produto não existe mais"}, {status:400});
    const estoque = Number((p.rows[0] as any).qtd);
    if(estoque < it.cartQtd) return NextResponse.json({error:`Estoque insuficiente: ${it.nome} só tem ${estoque}`}, {status:400});
  }

  const r = await db.execute({ sql: "INSERT INTO vendas (itens,total,pagamento,descricao) VALUES (?,?,?,?) RETURNING *", args: [JSON.stringify(itens), Number(total), pagamento, descricao||""] });

  for(const it of itens){
    await db.execute({ sql: "UPDATE produtos SET qtd = qtd -? WHERE id=?", args: [it.cartQtd, it.id] });
  }
  return NextResponse.json(r.rows[0]);
}

export async function DELETE(req: Request){
  const db = getDb();
  const {searchParams} = new URL(req.url);
  const id = Number(searchParams.get("id"));

  const venda = await db.execute({ sql: "SELECT itens FROM vendas WHERE id=?", args: [id] });
  if(venda.rows.length>0){
    try{
      const itens = JSON.parse((venda.rows[0] as any).itens);
      for(const it of itens){
        await db.execute({ sql: "UPDATE produtos SET qtd = qtd +? WHERE id=?", args: [it.cartQtd, it.id] });
      }
    }catch{}
  }

  await db.execute({ sql: "DELETE FROM vendas WHERE id=?", args: [id] });
  return NextResponse.json({ok:true});
}