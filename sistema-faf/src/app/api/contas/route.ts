import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        const contas = await prisma.contaBancaria.findMany({
            orderBy: { createdAt: 'desc' }
        });
        return NextResponse.json(contas);
    } catch (error) {
        return NextResponse.json({ error: 'Erro ao buscar contas' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { numero_conta, descricao } = body;

        if (!numero_conta) {
            return NextResponse.json({ error: 'Número da conta é obrigatório' }, { status: 400 });
        }

        const conta = await prisma.contaBancaria.create({
            data: {
                numero_conta,
                descricao,
            }
        });

        return NextResponse.json(conta, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: 'Erro ao criar conta bancária' }, { status: 500 });
    }
}
