import fs from 'fs'
import path from 'path'
import { promisify } from 'util'
import { NextResponse } from 'next/server'

const writeFile = promisify(fs.writeFile)

export async function GET(req) {
    console.log('----GET: ', req);

    await new Promise(resolve => setTimeout(resolve, 10000));

    // return new NextResponse('bad request', {
    //     status: 400,
    //     headers: {
    //         'Content-Type': 'application/json'
    //     }
    // });

    return Response.json({
        status: 'success',
        code: "t3"
    });

}