import fs from 'fs';
import crypto from 'crypto';
import path from 'path'
import { promisify } from 'util'
import { NextResponse } from 'next/server'

const writeFile = promisify(fs.writeFile);

function getSHA(filePath) {
    return new Promise((resolve, reject) => {
        const hash = crypto.createHash('sha256');
        const stream = fs.createReadStream(filePath);
    
        stream.on('data', (data) => {
            hash.update(data, 'utf8');
        });
    
        stream.on('end', () => {
            resolve(hash.digest('hex'));
        });
    
        stream.on('error', (error) => {
            reject(error);     
        });
    });
}

export async function GET(req) {  
    console.log('----GET: ', request);   
    return Response.json({
        a: 'share-chunk'
    });

}
 
export async function POST(req) {
    const fromData = await req.formData();
    // console.log('----data: ', fromData);

    const file = fromData.get('up');
    const fileName = decodeURIComponent(fromData.get('fileName'));
    const chunkNumber = fromData.get('chunkNumber');
    const totalChunks = fromData.get('totalChunks');
    const chunkSize = fromData.get('chunkSize');
    const sha = fromData.get('sha');
    console.log('----sha: ', sha);

    if (!file) {
        return NextResponse.json({ success: false }, { status: 400 })
    }

    const bytes = await file.arrayBuffer();
    const fileBuffer = Buffer.from(bytes);

    const tempDir = path.join(process.cwd(), 'public', 'temp', fileName.replace(/\s/g, '_').replace(/\./g, '_'));
    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
    }
    // console.log('----tempDir: ', tempDir);

    const filePath = path.join(tempDir, `${fileName}.part${chunkNumber}`);
    // console.log('----filePath: ', filePath);
    if (fs.existsSync(filePath)) {
        // const stats = fs.statSync(filePath);
        // if (stats.size != chunkSize) {
        //     await writeFile(filePath, Buffer.from(fileBuffer));
        // }
        const tempFileSHA = await getSHA(filePath);
        console.log('----tempFileSHA: ', tempFileSHA);
        if (tempFileSHA != sha) {
            await writeFile(filePath, Buffer.from(fileBuffer));
        }
    } else {
        await writeFile(filePath, Buffer.from(fileBuffer));
    }
    
    if(chunkNumber == totalChunks) {
        const finalFilePath = path.join(process.cwd(), 'public', fileName);
        const tempPath = path.join(tempDir, `${fileName}.part`);

        // 大文件报错
        // const partFileBuffer = fs.readFileSync(partFilePath);
        // writeStream.write(partFileBuffer);
        // fs.unlinkSync(partFilePath); 

        mergeFileChunks(finalFilePath, tempPath, totalChunks).then(()=>{
            console.log('-----------文件合并完成！');
            return NextResponse.json({ success: true })
        }).catch((error)=>{
            console.log('-----------mergeFileError', error);
        })
        
    }

    return NextResponse.json({ success: true })
}
async function mergeFileChunks(finalFilePath, tempPath, totalChunks){
    const writeStream = fs.createWriteStream(finalFilePath);
    for(let i = 1; i <= totalChunks; i++) {
        const partFilePath = `${tempPath}${i}`;
        await new Promise((reslove, reject)=>{
            const readStream = fs.createReadStream(partFilePath);
            readStream.pipe(writeStream, {end: false});
            readStream.on('error', reject);
            readStream.on('end', ()=>{
                fs.unlink(partFilePath, (error)=>{
                    error && console.log('-------------unlinkError:', partFilePath, error);
                });
                reslove();
            });
        });
    }
    writeStream.end();
}