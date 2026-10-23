
const fs = require('fs');
const path = require('path');

const consoleStyle = {
    redBG: '\x1b[97;41m',
    greenBG: '\x1b[97;42m',
    end: '\x1b[0m',
};

const log = (msg, style = '') => {
    console.log(style, msg, consoleStyle.end);
};

const arguments = process.argv.slice(2, 5);

const project = process.cwd();

console.log(process.execPath)
console.log(__dirname)
console.log(process.cwd())

let folder = '';
let name = '';
let num = 1;

const useError = () => {
    log(
        '参数：folder不能为空，name为可选名称，num为可选开始集数',
        consoleStyle.redBG,
    );
    log(
        '示例：node ./changeName.js folder=smb name=仙魔变 num=492',
    );
};

if (!arguments.length) {
    useError();
    return;
} else {
    arguments.forEach(arg => {
        const tempArr = arg.toLowerCase().split('=');
        if (tempArr[0] === 'folder') {
            folder = tempArr[1];
        } else if (tempArr[0] === 'name') {
            name = tempArr[1];
        } else if (tempArr[0] === 'num') {
            num = tempArr[1];
        }
    });

    if (!folder) {
        useError();
        return;
    }
}

const filePath = path.join(project, ...folder.split('/'));
log(`\n开始修改文件夹${filePath}下的文件名...`);

const files = fs.readdirSync(filePath);
log(files);

files.forEach(file => {

    // log(`\n文件名：---${file.split('X-')[0].substring(1)}`);
    // log(`\n文件名：---${decodeURIComponent(escape(atob(file.split('X-')[0].substring(1))))}`);
    try{
        if(file.startsWith('.')&&file!=='.DS_Store'){
            let tempFileNmae = file.replace(/-/g, '+');
            tempFileNmae = tempFileNmae.replace(/_/g, '/');
            const newName = decodeBase64(tempFileNmae.substring(1));
            if(newName){
                fs.renameSync(path.join(filePath, file), path.join(filePath, `${newName}.mp3`))
            }
        }
    }catch(err){
        log('\n文件名解释出错！', consoleStyle.greenBG);
        // if(file.includes('-')){
        //    ['a','b','c','d','e','f','g','h','i','j','k','l','m','n','o','p','q','r','s','t','u','v','w','x','y','z','A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z',0,1,2,3,4,5,6,7,8,9,'+','/'].forEach((item)=>{
        //         const tempFileNmae = file.replace('-', item);
        //         log(tempFileNmae)
        //         const newName = decodeBase64(tempFileNmae.substring(1))
        //         log(newName)
        //    }) 
        // }
    }
    
});

function decodeBase64(base64String) {
    // 将Base64字符串分成每64个字符一组
    const padding = (base64String.length % 4) === 0 ? 0 : 4 - (base64String.length % 4);
    base64String = base64String + '='.repeat(padding);
 
    // 使用atob()函数解码Base64字符串
    const binaryString = atob(base64String);
 
    // 将二进制字符串转换为TypedArray
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
 
    // 使用TextDecoder对象解码UTF-8字符串
    const decoder = new TextDecoder();
    return decoder.decode(bytes);
}

log('\n所有修改已经完成！');





