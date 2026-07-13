export async function downloadFile(url: string, fileName: string) {
  try {
    const response = await fetch(url, { credentials: "include" });
    if (!response.ok) throw new Error("下载失败");
    const objectUrl = URL.createObjectURL(await response.blob());
    triggerDownload(objectUrl, fileName);
    URL.revokeObjectURL(objectUrl);
  } catch {
    // 跨域资源可能禁止 fetch；保留浏览器原生下载作为兼容回退。
    triggerDownload(url, fileName);
  }
}

function triggerDownload(url: string, fileName: string) {
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.rel = "noopener";
  link.click();
}
