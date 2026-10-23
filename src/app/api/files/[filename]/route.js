import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET(request, ctx) {
  try {
    const { filename } = await ctx.params;
    const filePath = path.join(process.cwd(), "uploads", filename);

    // 检查文件是否存在
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ message: "文件不存在" }, { status: 404 });
    }

    // 读取文件内容
    const fileBuffer = fs.readFileSync(filePath);

    // 设置响应头
    const headers = new Headers();
    headers.append("Content-Type", "application/octet-stream");
    headers.append(
      "Content-Disposition",
      `attachment; filename="${encodeURIComponent(
        filename.split("_")[1] || filename
      )}"`
    );

    // 返回文件响应
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: headers,
    });
  } catch (error) {
    console.error("文件下载错误:", error);
    return NextResponse.json({ message: "文件下载失败" }, { status: 500 });
  }
}
