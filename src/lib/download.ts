/** Saves a file from a link (the browser downloads it and the page stays as it is). */
export function downloadFile(url: string): void {
  const link = document.createElement("a");
  link.href = url;
  link.download = "";
  link.click();
}
