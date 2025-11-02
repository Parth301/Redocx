import React, { useState } from "react";
import axios from "axios";

function FormatPage() {
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [isDragging, setIsDragging] = useState(false);

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            setFile(selectedFile);
            setMessage("");
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        const droppedFile = e.dataTransfer.files[0];
        if (droppedFile && droppedFile.name.endsWith(".docx")) {
            setFile(droppedFile);
            setMessage("");
        } else {
            setMessage("❌ Only .docx files are supported.");
        }
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

            const response = await axios.post("/api/format", formData, {
                responseType: "blob",
                headers: { "Content-Type": "multipart/form-data" },
            });

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
        <div style={styles.wrapper}>
            <div style={styles.container}>
                {/* Back Button */}
                <button
                    style={styles.backButton}
                    onClick={() => window.history.back()}
                    onMouseEnter={(e) => e.target.style.background = '#EBBAF2'}
                    onMouseLeave={(e) => e.target.style.background = 'transparent'}
                >
                    ← Back
                </button>

                <div style={styles.card}>
                    {/* Header */}
                    <div style={styles.header}>
                        <div style={styles.iconCircle}>
                            <span style={styles.icon}>✨</span>
                        </div>
                        <h2 style={styles.title}>AI Document Formatter</h2>
                        <p style={styles.subtitle}>
                            Upload your unformatted <strong>.docx</strong> file and let Gemini
                            automatically style, structure, and format it beautifully.
                        </p>
                    </div>

                    {/* Upload Zone */}
                    <div
                        style={{
                            ...styles.dropZone,
                            borderColor: isDragging ? '#463671' : '#EBBAF2',
                            background: isDragging ? '#f3e5f5' : '#FBEFFA',
                        }}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={() => document.getElementById('fileInput').click()}
                    >
                        <div style={styles.uploadIcon}>📄</div>
                        <p style={styles.dropText}>
                            {file ? (
                                <>
                                    <strong>{file.name}</strong>
                                    <br />
                                    <span style={styles.changeFile}>Click to change file</span>
                                </>
                            ) : (
                                <>
                                    Drag & drop your .docx file here
                                    <br />
                                    or <strong style={styles.browseText}>browse</strong>
                                </>
                            )}
                        </p>
                        <input
                            id="fileInput"
                            type="file"
                            accept=".docx"
                            onChange={handleFileChange}
                            style={styles.hiddenInput}
                        />
                    </div>

                    {/* Submit Button */}
                    <button
                        onClick={handleSubmit}
                        disabled={loading || !file}
                        style={{
                            ...styles.submitButton,
                            opacity: loading || !file ? 0.5 : 1,
                            cursor: loading || !file ? 'not-allowed' : 'pointer',
                        }}
                        onMouseEnter={(e) => {
                            if (!loading && file) {
                                e.target.style.transform = 'translateY(-2px)';
                                e.target.style.boxShadow = '0 15px 50px rgba(70, 54, 113, 0.4)';
                            }
                        }}
                        onMouseLeave={(e) => {
                            e.target.style.transform = 'translateY(0)';
                            e.target.style.boxShadow = '0 10px 30px rgba(70, 54, 113, 0.3)';
                        }}
                    >
                        {loading ? (
                            <>
                                <span style={styles.spinner}>⏳</span>
                                Formatting...
                            </>
                        ) : (
                            <>
                                <span style={styles.buttonIcon}>🚀</span>
                                Format with Gemini
                            </>
                        )}
                    </button>

                    {/* Message */}
                    {message && (
                        <div style={{
                            ...styles.message,
                            color: message.includes('✅') ? '#10b981' :
                                message.includes('❌') ? '#ef4444' : '#6b5491'
                        }}>
                            {message}
                        </div>
                    )}

                    {/* Info Section */}
                    <div style={styles.infoSection}>
                        <div style={styles.infoItem}>
                            <span style={styles.infoIcon}>⚡</span>
                            <span style={styles.infoText}>Processing takes ~10 seconds</span>
                        </div>
                        <div style={styles.infoItem}>
                            <span style={styles.infoIcon}>🔒</span>
                            <span style={styles.infoText}>Your files are secure</span>
                        </div>
                        <div style={styles.infoItem}>
                            <span style={styles.infoIcon}>✨</span>
                            <span style={styles.infoText}>AI-powered formatting</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

const styles = {
    wrapper: {
        minHeight: "100vh",
        background: "linear-gradient(180deg, #FBEFFA 0%, #EBBAF2 50%, #FBEFFA 100%)",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        padding: "40px 20px",
    },
    container: {
        maxWidth: "600px",
        margin: "0 auto",
        position: "relative",
    },
    backButton: {
        background: "transparent",
        border: "2px solid #EBBAF2",
        borderRadius: "10px",
        padding: "10px 20px",
        fontSize: "0.95rem",
        fontWeight: "600",
        color: "#463671",
        cursor: "pointer",
        transition: "all 0.3s ease",
        marginBottom: "20px",
        display: "inline-flex",
        alignItems: "center",
        gap: "8px",
    },
    card: {
        background: "#FBEFFA",
        borderRadius: "24px",
        padding: "48px 40px",
        boxShadow: "0 20px 60px rgba(70, 54, 113, 0.15)",
        border: "1px solid #EBBAF2",
    },
    header: {
        textAlign: "center",
        marginBottom: "40px",
    },
    iconCircle: {
        width: "80px",
        height: "80px",
        borderRadius: "50%",
        background: "linear-gradient(135deg, #463671 0%, #6b4e9e 100%)",
        margin: "0 auto 20px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 10px 30px rgba(70, 54, 113, 0.3)",
    },
    icon: {
        fontSize: "2.5rem",
    },
    title: {
        fontSize: "2rem",
        fontWeight: "700",
        color: "#463671",
        marginBottom: "12px",
        letterSpacing: "-0.02em",
    },
    subtitle: {
        fontSize: "1rem",
        color: "#6b5491",
        lineHeight: "1.6",
        maxWidth: "480px",
        margin: "0 auto",
    },
    dropZone: {
        border: "3px dashed #EBBAF2",
        borderRadius: "16px",
        padding: "60px 40px",
        textAlign: "center",
        cursor: "pointer",
        transition: "all 0.3s ease",
        marginBottom: "24px",
        background: "#FBEFFA",
    },
    uploadIcon: {
        fontSize: "4rem",
        marginBottom: "16px",
    },
    dropText: {
        fontSize: "1.05rem",
        color: "#6b5491",
        lineHeight: "1.6",
        margin: 0,
    },
    browseText: {
        color: "#463671",
        cursor: "pointer",
    },
    changeFile: {
        fontSize: "0.9rem",
        color: "#9b7ec4",
        fontWeight: "500",
    },
    hiddenInput: {
        display: "none",
    },
    submitButton: {
        width: "100%",
        background: "linear-gradient(135deg, #463671 0%, #6b4e9e 100%)",
        color: "#fff",
        border: "none",
        borderRadius: "14px",
        padding: "18px 40px",
        fontSize: "1.1rem",
        fontWeight: "600",
        cursor: "pointer",
        transition: "all 0.3s ease",
        boxShadow: "0 10px 30px rgba(70, 54, 113, 0.3)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "10px",
    },
    buttonIcon: {
        fontSize: "1.3rem",
    },
    spinner: {
        fontSize: "1.3rem",
        animation: "spin 1s linear infinite",
    },
    message: {
        marginTop: "24px",
        padding: "16px",
        borderRadius: "12px",
        background: "#fff",
        fontSize: "0.95rem",
        fontWeight: "500",
        textAlign: "center",
        border: "1px solid #EBBAF2",
    },
    infoSection: {
        marginTop: "32px",
        paddingTop: "32px",
        borderTop: "1px solid #EBBAF2",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
    },
    infoItem: {
        display: "flex",
        alignItems: "center",
        gap: "12px",
        color: "#6b5491",
        fontSize: "0.9rem",
    },
    infoIcon: {
        fontSize: "1.3rem",
    },
    infoText: {
        fontWeight: "500",
    },
};

// Add spinning animation and hide scrollbar
const styleSheet = document.createElement("style");
styleSheet.textContent = `
    /* Hide scrollbar for Chrome, Safari and Opera */
    body::-webkit-scrollbar,
    html::-webkit-scrollbar {
        display: none;
    }
    
    /* Hide scrollbar for IE, Edge and Firefox */
    body,
    html {
        -ms-overflow-style: none;  /* IE and Edge */
        scrollbar-width: none;  /* Firefox */
    }
    
    @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }
    @media (max-width: 768px) {
        .card { padding: 32px 24px !important; }
    }
`;
document.head.appendChild(styleSheet);

export default FormatPage;
