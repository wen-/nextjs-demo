import fs from 'fs'
import path from 'path'
import { promisify } from 'util'
import { NextResponse } from 'next/server'

const writeFile = promisify(fs.writeFile)

export async function GET(req) {
    console.log('----GET: ', request);
    return Response.json({
        a: 'abc'
    });

}
 
export async function POST(req) {
    const data = await req.formData()
    console.log('----data: ', data);
    const file = data.get('up');

    if (!file) {
        return NextResponse.json({ success: false }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const fileBuffer = Buffer.from(bytes)

    const filePath = path.join(`./public/${file.name}`);
    console.log('----filePath: ', filePath);
    await writeFile(filePath, Buffer.from(fileBuffer))

    return NextResponse.json({ success: true })
}