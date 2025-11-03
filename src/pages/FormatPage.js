import React, { useState, useEffect } from "react";
import axios from "axios";

function FormatPage() {
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [isDragging, setIsDragging] = useState(false);
    const [progress, setProgress] = useState({ stage: 0, text: "" });

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            setFile(selectedFile);
            setMessage("");
            setProgress({ stage: 0, text: "" });
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
            setProgress({ stage: 0, text: "" });
        } else {
            setMessage("❌ Only .docx files are supported.");
        }
    };

    // Enhanced progress stages with image analysis
    useEffect(() => {
        if (loading) {
            const stages = [
                { stage: 1, text: "📄 Extracting document content...", delay: 1000 },
                { stage: 2, text: "🖼️ Analyzing images with AI vision...", delay: 3000 },
                { stage: 3, text: "🧠 AI generating formatting plan...", delay: 6000 },
                { stage: 4, text: "🔧 Building formatted document...", delay: 9000 },
                { stage: 5, text: "✅ Finalizing with intelligent image placement...", delay: 12000 }
            ];

            const timers = stages.map(({ stage, text, delay }) =>
                setTimeout(() => setProgress({ stage, text }), delay)
            );

            return () => timers.forEach(timer => clearTimeout(timer));
        }
    }, [loading]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!file) return setMessage("⚠️ Please upload a .docx file first.");

        if (!file.name.endsWith(".docx"))
            return setMessage("❌ Only .docx files are supported.");

        setLoading(true);
        setProgress({ stage: 0, text: "🚀 Starting AI processing..." });
        setMessage("");

        try {
            const formData = new FormData();
            formData.append("file", file);

            const response = await axios.post("/api/format", formData, {
                responseType: "blob",
                headers: { "Content-Type": "multipart/form-data" },
                timeout: 90000, // Increased to 90 seconds for image analysis
            });

            // Download the formatted document
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement("a");
            link.href = url;
            link.setAttribute("download", "formatted.docx");
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);

            setMessage("✅ Success! Your professionally formatted document with AI-analyzed images has been downloaded.");
            setProgress({ stage: 0, text: "" });
        } catch (error) {
            console.error("❌ Formatting error:", error);

            let errorMsg = "❌ Something went wrong while formatting. Please try again.";

            if (error.code === 'ECONNABORTED') {
                errorMsg = "⏱️ Request timed out. Large files with images may take longer.";
            } else if (error.response?.status === 413) {
                errorMsg = "📦 File is too large. Maximum size is 10MB.";
            } else if (error.response?.status === 400) {
                errorMsg = "❌ Invalid file format. Please upload a valid .docx file.";
            } else if (error.response?.data?.details) {
                errorMsg = `❌ ${error.response.data.details}`;
            }

            setMessage(errorMsg);
            setProgress({ stage: 0, text: "" });
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
                            Upload your unformatted <strong>.docx</strong> file and let our advanced
                            AI analyze content, images, and structure to create professional formatting.
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
                                    <span style={styles.fileSize}>
                                        {(file.size / 1024).toFixed(1)} KB
                                    </span>
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

                    {/* Enhanced Progress Indicator */}
                    {loading && progress.stage > 0 && (
                        <div style={styles.progressContainer}>
                            <div style={styles.progressBar}>
                                <div style={{
                                    ...styles.progressFill,
                                    width: `${(progress.stage / 5) * 100}%`
                                }} />
                            </div>
                            <p style={styles.progressText}>{progress.text}</p>
                            <div style={styles.stageIndicators}>
                                {[1, 2, 3, 4, 5].map(stage => (
                                    <div
                                        key={stage}
                                        style={{
                                            ...styles.stageIndicator,
                                            background: progress.stage >= stage ? '#463671' : '#E7E6E6'
                                        }}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

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
                                Processing with AI Vision...
                            </>
                        ) : (
                            <>
                                <span style={styles.buttonIcon}>🚀</span>
                                Format with AI
                            </>
                        )}
                    </button>

                    {/* Message */}
                    {message && (
                        <div style={{
                            ...styles.message,
                            color: message.includes('✅') ? '#10b981' :
                                message.includes('❌') ? '#ef4444' :
                                    message.includes('⏱️') ? '#f59e0b' : '#6b5491'
                        }}>
                            {message}
                        </div>
                    )}

                    {/* Info Section */}
                    <div style={styles.infoSection}>
                        <div style={styles.infoItem}>
                            <span style={styles.infoIcon}>⚡</span>
                            <span style={styles.infoText}>5-stage AI processing</span>
                        </div>
                        <div style={styles.infoItem}>
                            <span style={styles.infoIcon}>🔒</span>
                            <span style={styles.infoText}>Zero data loss guaranteed</span>
                        </div>
                        <div style={styles.infoItem}>
                            <span style={styles.infoIcon}>👁️</span>
                            <span style={styles.infoText}>AI vision for image analysis</span>
                        </div>
                    </div>

                    {/* Features */}
                    <div style={styles.featuresSection}>
                        <h3 style={styles.featuresTitle}>What gets improved:</h3>
                        <div style={styles.featuresList}>
                            <div style={styles.feature}>
                                <span style={styles.featureIcon}>📋</span>
                                <span style={styles.featureText}>Headings & hierarchy</span>
                            </div>
                            <div style={styles.feature}>
                                <span style={styles.featureIcon}>📊</span>
                                <span style={styles.featureText}>Tables & formatting</span>
                            </div>
                            <div style={styles.feature}>
                                <span style={styles.featureIcon}>🖼️</span>
                                <span style={styles.featureText}>Smart image placement</span>
                            </div>
                            <div style={styles.feature}>
                                <span style={styles.featureIcon}>📝</span>
                                <span style={styles.featureText}>Lists & spacing</span>
                            </div>
                            <div style={styles.feature}>
                                <span style={styles.featureIcon}>🎯</span>
                                <span style={styles.featureText}>AI-generated captions</span>
                            </div>
                            <div style={styles.feature}>
                                <span style={styles.featureIcon}>🔍</span>
                                <span style={styles.featureText}>Image content analysis</span>
                            </div>
                        </div>
                    </div>

                    {/* New AI Vision Info Card */}
                    <div style={styles.aiVisionCard}>
                        <div style={styles.aiVisionHeader}>
                            <span style={styles.aiVisionIcon}>🤖</span>
                            <span style={styles.aiVisionTitle}>Powered by Gemini Vision AI</span>
                        </div>
                        <p style={styles.aiVisionText}>
                            Our AI analyzes every image in your document to understand its content,
                            context, and purpose - then intelligently positions it with relevant captions.
                        </p>
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
    fileSize: {
        fontSize: "0.85rem",
        color: "#9b7ec4",
        display: "block",
        marginTop: "4px",
    },
    changeFile: {
        fontSize: "0.9rem",
        color: "#9b7ec4",
        fontWeight: "500",
    },
    hiddenInput: {
        display: "none",
    },
    progressContainer: {
        marginBottom: "24px",
        padding: "20px",
        background: "#fff",
        borderRadius: "12px",
        border: "1px solid #EBBAF2",
    },
    progressBar: {
        width: "100%",
        height: "8px",
        background: "#E7E6E6",
        borderRadius: "4px",
        overflow: "hidden",
        marginBottom: "12px",
    },
    progressFill: {
        height: "100%",
        background: "linear-gradient(90deg, #463671 0%, #6b4e9e 100%)",
        transition: "width 0.5s ease",
        borderRadius: "4px",
    },
    progressText: {
        fontSize: "0.95rem",
        color: "#6b5491",
        fontWeight: "500",
        textAlign: "center",
        margin: "0 0 12px 0",
    },
    stageIndicators: {
        display: "flex",
        justifyContent: "center",
        gap: "8px",
    },
    stageIndicator: {
        width: "32px",
        height: "4px",
        borderRadius: "2px",
        transition: "background 0.3s ease",
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
    featuresSection: {
        marginTop: "24px",
        paddingTop: "24px",
        borderTop: "1px solid #EBBAF2",
    },
    featuresTitle: {
        fontSize: "0.95rem",
        fontWeight: "600",
        color: "#463671",
        marginBottom: "12px",
    },
    featuresList: {
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "8px",
    },
    feature: {
        display: "flex",
        alignItems: "center",
        gap: "8px",
        fontSize: "0.85rem",
        color: "#6b5491",
    },
    featureIcon: {
        fontSize: "1.1rem",
    },
    featureText: {
        fontWeight: "500",
    },
    aiVisionCard: {
        marginTop: "24px",
        padding: "20px",
        background: "linear-gradient(135deg, rgba(70, 54, 113, 0.05) 0%, rgba(107, 78, 158, 0.05) 100%)",
        borderRadius: "12px",
        border: "1px solid #EBBAF2",
    },
    aiVisionHeader: {
        display: "flex",
        alignItems: "center",
        gap: "10px",
        marginBottom: "8px",
    },
    aiVisionIcon: {
        fontSize: "1.5rem",
    },
    aiVisionTitle: {
        fontSize: "0.95rem",
        fontWeight: "600",
        color: "#463671",
    },
    aiVisionText: {
        fontSize: "0.85rem",
        color: "#6b5491",
        lineHeight: "1.5",
        margin: 0,
    },
};

// Add animations and styles
const styleSheet = document.createElement("style");
styleSheet.textContent = `
    body::-webkit-scrollbar,
    html::-webkit-scrollbar {
        display: none;
    }
    
    body,
    html {
        -ms-overflow-style: none;
        scrollbar-width: none;
    }
    
    @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }
    
    @media (max-width: 768px) {
        .card { padding: 32px 24px !important; }
        .featuresList { grid-template-columns: 1fr !important; }
    }
`;
document.head.appendChild(styleSheet);

export default FormatPage;
