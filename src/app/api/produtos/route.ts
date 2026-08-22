import { NextResponse } from "next/server";
import { createClient } from "@libsql/client";

const getDb = () => createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!
});

export async function GET(){
  const db = getDb();
  await db.execute(`CREATE TABLE IF NOT EXISTS produtos (id INTEGER PRIMARY KEY AUTOINCREMENT, nome TEXT, preco TEXT, qtd INTEGER, imagem TEXT)`);
  const r = await db.execute("SELECT * FROM produtos ORDER BY id DESC");
  return NextResponse.json(r.rows);
}

export async function POST(req: Request){
  const db = getDb();
  const {nome, preco, qtd, imagem} = await req.json();
  const nomeTrim = nome.trim();

  const existing = await db.execute({ sql: "SELECT * FROM produtos WHERE LOWER(nome)=LOWER(?) LIMIT 1", args: [nomeTrim] });
  if(existing.rows.length > 0){
    const prod: any = existing.rows[0];
    const novaQtd = Number(prod.qtd) + Number(qtd||0);
    await db.execute({ sql: "UPDATE produtos SET qtd=?, preco=?, imagem=? WHERE id=?", args: [novaQtd, String(preco), imagem, prod.id] });
    const r = await db.execute({ sql: "SELECT * FROM produtos WHERE id=?", args: [prod.id] });
    return NextResponse.json(r.rows[0]);
  }

  const r = await db.execute({ sql: "INSERT INTO produtos (nome,preco,qtd,imagem) VALUES (?,?,?,?) RETURNING *", args: [nomeTrim, String(preco), Number(qtd)||0, imagem] });
  return NextResponse.json(r.rows[0]);
}

export async function PUT(req: Request){
  const db = getDb();
  const {id, qtd} = await req.json();
  await db.execute({ sql: "UPDATE produtos SET qtd=? WHERE id=?", args: [Number(qtd), Number(id)] });
  const r = await db.execute({ sql: "SELECT * FROM produtos WHERE id=?", args: [Number(id)] });
  return NextResponse.json(r.rows[0]);
}

export async function DELETE(req: Request){
  const db = getDb();
  const {searchParams} = new URL(req.url);
  await db.execute({ sql: "DELETE FROM produtos WHERE id=?", args: [Number(searchParams.get("id"))] });
  return NextResponse.json({ok:true});
}