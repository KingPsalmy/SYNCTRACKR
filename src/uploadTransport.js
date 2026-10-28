// XHR exposes actual bytes sent; fetch does not expose upload progress.
export function putFile(url, file, onProgress, createRequest = () => new XMLHttpRequest()) {
  return new Promise((resolve, reject) => {
    const xhr = createRequest()
    xhr.open('PUT', url)
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream')
    xhr.upload.onprogress = event => {
      if (event.lengthComputable && event.total > 0) onProgress?.(Math.min(100, Math.round(event.loaded / event.total * 100)))
    }
    xhr.onload = () => xhr.status >= 200 && xhr.status < 300
      ? resolve() : reject(new Error(`Storage upload failed (${xhr.status})`))
    xhr.onerror = () => reject(new Error('Upload interrupted. Check your connection and try again.'))
    xhr.onabort = () => reject(new Error('Upload cancelled.'))
    xhr.send(file)
  })
}
