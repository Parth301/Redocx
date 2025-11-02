import React, { useState } from "react";
import axios from "axios";

function FormatPage() {
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");

    const handleFileChange = (e) => {
        setFile(e.target.files[0]);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!file) return setMessage("⚠️ Please upload a .docx file first.");

        if (!file.name.endsWith(".docx"))
            return setMessage("❌ Only .docx files are supported.");

        setLoading(true);
        setMessage("🧠 Analyzing and formatting your document with Gemini...");

        try {
            const formData = new FormData();
            formData.append("file", file);

            // Send file to backend
            const response = await axios.post("/api/format", formData, {
                responseType: "blob",
                headers: { "Content-Type": "multipart/form-data" },
            });

            // Download formatted file
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement("a");
            link.href = url;
            link.setAttribute("download", "formatted.docx");
            document.body.appendChild(link);
            link.click();

            setMessage("✅ AI formatting complete! Your document has been downloaded.");
        } catch (error) {
            console.error("❌ Formatting error:", error);
            setMessage("❌ Something went wrong while formatting. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={styles.container}>
            <div style={styles.card}>
                <h2 style={styles.title}>AI DOCX Formatter</h2>
                <p style={styles.subtitle}>
                    Upload your unformatted <strong>.docx</strong> file and let Gemini
                    automatically style, structure, and format it beautifully.
                </p>

                <form onSubmit={handleSubmit} style={styles.form}>
                    <input
                        type="file"
                        accept=".docx"
                        onChange={handleFileChange}
                        style={styles.fileInput}
                    />
                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            ...styles.button,
                            backgroundColor: loading ? "#a5b4fc" : "#4f46e5",
                        }}
                    >
                        {loading ? "Formatting..." : "Format with Gemini"}
                    </button>
                </form>

                <p style={styles.message}>{message}</p>
            </div>
        </div>
    );
}

const styles = {
    container: {
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        backgroundColor: "#f8fafc",
        fontFamily: "Inter, Arial, sans-serif",
    },
    card: {
        backgroundColor: "#fff",
        padding: "40px",
        borderRadius: "16px",
        boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
        textAlign: "center",
        width: "400px",
    },
    title: {
        fontSize: "1.8rem",
        color: "#1e293b",
        marginBottom: "10px",
    },
    subtitle: {
        fontSize: "0.95rem",
        color: "#64748b",
        marginBottom: "25px",
    },
    form: {
        marginBottom: "20px",
    },
    fileInput: {
        display: "block",
        margin: "0 auto 20px auto",
        padding: "10px",
        border: "1px solid #cbd5e1",
        borderRadius: "8px",
        cursor: "pointer",
    },
    button: {
        backgroundColor: "#4f46e5",
        color: "#fff",
        border: "none",
        padding: "10px 20px",
        borderRadius: "8px",
        cursor: "pointer",
        fontWeight: "600",
    },
    message: {
        marginTop: "15px",
        color: "#475569",
        fontSize: "0.9rem",
    },
};

export default FormatPage;