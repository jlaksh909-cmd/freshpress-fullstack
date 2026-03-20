"use client"

import { useState, useRef } from "react"
import { createClient } from "@/lib/supabase/client"

interface PhotoUploadProps {
  label: string
  currentUrl?: string | null
  onUpload: (url: string) => void
}

export default function PhotoUpload({ label, currentUrl, onUpload }: PhotoUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(currentUrl || null)
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  const handleFile = async (file: File) => {
    if (!file || !file.type.startsWith("image/")) return

    setUploading(true)
    const fileExt = file.name.split(".").pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`
    const filePath = `quality-photos/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from("service-photos")
      .upload(filePath, file, { cacheControl: "3600", upsert: false })

    if (uploadError) {
      console.error("Upload error:", uploadError)
      setUploading(false)
      return
    }

    const { data } = supabase.storage.from("service-photos").getPublicUrl(filePath)
    const publicUrl = data.publicUrl

    setPreview(publicUrl)
    onUpload(publicUrl)
    setUploading(false)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      <span style={{ fontSize: "0.7rem", opacity: 0.6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {label}
      </span>

      {preview ? (
        <div style={{ position: "relative", borderRadius: "12px", overflow: "hidden" }}>
          <img
            src={preview}
            alt={label}
            style={{ width: "100%", height: "100px", objectFit: "cover", display: "block", borderRadius: "12px", border: "1px solid rgba(16,185,129,0.3)" }}
          />
          <button
            type="button"
            onClick={() => { setPreview(null); onUpload(""); if (inputRef.current) inputRef.current.value = "" }}
            style={{
              position: "absolute", top: "6px", right: "6px",
              background: "rgba(0,0,0,0.7)", border: "none", borderRadius: "50%",
              width: "24px", height: "24px", color: "white", cursor: "pointer",
              fontSize: "0.7rem", display: "flex", alignItems: "center", justifyContent: "center"
            }}
          >✕</button>
          <div style={{ position: "absolute", bottom: "6px", left: "6px", fontSize: "0.6rem", color: "#10b981", background: "rgba(0,0,0,0.6)", padding: "2px 8px", borderRadius: "10px" }}>
            ✅ Uploaded
          </div>
        </div>
      ) : (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          style={{
            height: "100px",
            borderRadius: "12px",
            border: `2px dashed ${dragOver ? "rgba(245,200,66,0.6)" : "rgba(255,255,255,0.15)"}`,
            background: dragOver ? "rgba(245,200,66,0.05)" : "rgba(255,255,255,0.02)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px",
            cursor: uploading ? "wait" : "pointer",
            transition: "all 0.2s",
          }}
        >
          {uploading ? (
            <>
              <div className="spinner" style={{ width: "20px", height: "20px" }} />
              <span style={{ fontSize: "0.7rem", opacity: 0.6 }}>Uploading...</span>
            </>
          ) : (
            <>
              <span style={{ fontSize: "1.4rem" }}>📷</span>
              <span style={{ fontSize: "0.7rem", opacity: 0.6 }}>Click or drag & drop</span>
            </>
          )}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleInputChange}
        style={{ display: "none" }}
      />
    </div>
  )
}
