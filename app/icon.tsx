import { ImageResponse } from "next/server"

export const runtime = "edge"

export const size = {
  width: 32,
  height: 32,
}

export const contentType = "image/png"

export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        fontSize: 24,
        background: "#7b0d1e", // burgundy color
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "white",
        borderRadius: "50%",
      }}
    >
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M2 10v3" />
        <path d="M6 6v11" />
        <path d="M10 3v18" />
        <path d="M14 8v7" />
        <path d="M18 5v13" />
        <path d="M22 10v3" />
      </svg>
    </div>,
    {
      ...size,
    },
  )
}

