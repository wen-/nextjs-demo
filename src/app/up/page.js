"use client";
import React, { useState, useEffect, useCallback } from "react";
import CryptoJS from "crypto-js";

export default function UP() {
  const [selectedFile, setSelectedFile] = useState();
  const [progress, setProgress] = useState({});

  const getSHA = useCallback(async (file) => { 
    //实现Promise 方式读取文件
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async function(e) {
        const arrayBuffer = e.target.result;
        // 计算 SHA-256 散列值
        let hashHex = '';
        if(crypto?.subtle?.digest){
        const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
          hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        }else{
          // Convert ArrayBuffer to WordArray
          const wordArray = CryptoJS.lib.WordArray.create(arrayBuffer);
          // Calculate SHA-256 hash
          const hash = CryptoJS.SHA256(wordArray);
          // Convert hash to hex string
          hashHex = hash.toString(CryptoJS.enc.Hex);
        }
        console.log('SHA-256:', hashHex);
        resolve(hashHex);
      };
      reader.onerror = function(error) {
        console.error('Error reading file:', error);
        reject(error);
      };
      // 读取文件为 ArrayBuffer
      reader.readAsArrayBuffer(file);                                                    
    });
  }, []);

  const uploadFile = useCallback((file) => {
    const size100M = 1000 * 1024 * 1024;
    if (file.size <= size100M) {
      const formData = new FormData();
      formData.append("up", file);
      const xhr = new XMLHttpRequest();
      xhr.open("POST", "/share", true);

      // 监听进度事件
      xhr.upload.onprogress = function (event) {
        if (event.lengthComputable) {
          const percentage = (event.loaded / event.total) * 100;
          const loaded = (event.loaded / 1024 / 1024).toFixed(2);
          setProgress((pre) => ({
            ...pre,
            [encodeURIComponent(file.name)]: {percentage, loaded},
          }));
        }
      };

      // 请求完成后的处理
      xhr.onload = function () {
        if (xhr.status === 200) {
          console.log("文件上传成功");
          setProgress((pre) => {
            return { ...pre, [encodeURIComponent(file.name)]: {percentage: 100, loaded: file.size} };
          });
        } else {
          console.error("上传失败");
          setProgress((pre) => ({
            ...pre,
            [encodeURIComponent(file.name)]: {percentage: 0, loaded: 0},
          }));
        }
      };

      // 发送请求
      xhr.send(formData);
    } else {
      const chunkSize = 1024 * 1024 * 500; // 定义每个块的大小，例如5MB
      const chunks = Math.ceil(file.size / chunkSize);
      let currentChunk = 0;
 
      const uploadNextChunk = async () => {
        if (currentChunk < chunks) {
          const start = currentChunk * chunkSize;
          const end = Math.min(start + chunkSize, file.size);
          const chunk = file.slice(start, end); // 获取当前块的内容
          const fileSHA = await getSHA(chunk);
          console.log(`Uploading chunk ${currentChunk + 1} of ${chunks}: `, fileSHA);
          const formData = new FormData();
          formData.append("up", chunk);
          formData.append("fileName", encodeURIComponent(file.name));
          formData.append("chunkNumber", currentChunk + 1);
          formData.append("totalChunks", chunks);
          formData.append("chunkSize", chunk.size);
          formData.append("sha", fileSHA);

          const xhr = new XMLHttpRequest();
          xhr.open("POST", "/share-chunk", true);

          xhr.upload.onprogress = function (event) {
            if (event.lengthComputable) {
              const percentage =
                (currentChunk / chunks) * 100 +
                (event.loaded / event.total) * (100 / chunks);
              const loaded = ((currentChunk * chunkSize + event.loaded)/1024/1024).toFixed(2);
              setProgress((pre) => ({
                ...pre,
                [encodeURIComponent(file.name)]: {percentage, loaded},
              }));
            }
          };

          xhr.onload = function () {
            if (xhr.status === 200) {
              console.log(`Chunk ${currentChunk + 1} uploaded`);
              currentChunk++;
              uploadNextChunk(); // 上传下一个块
            } else {
              console.error("上传失败");
              setProgress((pre) => ({
                ...pre,
                [encodeURIComponent(file.name)]: {percentage: 0, loaded: 0},
              }));
            }
          };

          xhr.send(formData);
        } else {
          console.log("所有块上传完成");
          setProgress((pre) => ({
            ...pre,
            [encodeURIComponent(file.name)]: {percentage: 100, loaded: (file.size / 1024 / 1024).toFixed(2)},
          }));
        }
      };

      uploadNextChunk(); // 开始上传第一个块
    }
  }, []);

  const up = () => {
    if (selectedFile) {
      console.log("selectedFile: ", selectedFile);
      Array.from(selectedFile).forEach((file) => {
        uploadFile(file);
      });
    }
  };

  const renderFile = () => {
    if (selectedFile) {
      return (
        <div className={"w-full"}>
          <h2>Files you uploaded</h2>
          <ul>
            {Array.from(selectedFile).map((file) => (
              <li key={file.name}>
                <div className={"flex"}>
                  <span className={"flex-1"}>{file.name}</span>
                  <span>{((progress[encodeURIComponent(file.name)]?.loaded||0) / 1024 / 1024).toFixed(2)}/{(file.size / 1024 / 1024).toFixed(2)} Mb</span>
                </div>
                <div className={"border h-4"}>
                  <div
                    className={"bg-green-500 h-full"}
                    style={{
                      width: `${progress[encodeURIComponent(file.name)]?.percentage || 0}%`,
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>
      );
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center p-4">
      <h1 className="text-4xl font-bold, mb-4">UP</h1>
      <form method="POST" encType="multipart/form-data" action="/api/share">
        <input
          type="file"
          name="up"
          multiple
          onChange={(e) => {
            setSelectedFile(e.target.files);
          }}
        />
        <button
          className="rounded-3xl w-full py-2 my-6 px-4 bg-amber-300"
          type="button"
          onClick={() => up()}
        >
          Submit
        </button>
      </form>
      {renderFile()}
    </main>
  );
}
