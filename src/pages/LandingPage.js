import React, { useState } from "react";

function LandingPage() {
    const [hoveredCard, setHoveredCard] = useState(null);

    const handleGetStarted = () => {
        console.log("Navigate to upload page");
        window.location.href = "/format";
    }

    return (
        <div style={styles.wrapper}>
            <div style={styles.container}>
                {/* Header */}
                <nav style={styles.nav}>
                    <div style={styles.logo}>
                        <div style={styles.logoCircle}>R</div>
                        <span style={styles.logoText}>Redocx</span>
                    </div>
                </nav>

                {/* Hero */}
                <div style={styles.hero}>
                    <h1 style={styles.title}>
                        Make your documents look
                        <br />
                        <span style={styles.titleGradient}>actually professional</span>
                    </h1>

                    <p style={styles.subtitle}>
                        Drop in your messy Word doc. Get back something clean.
                        <br />
                        Perfect for AI outputs, drafts, or anything that needs polish.
                    </p>

                    <button
                        style={styles.mainCta}
                        onClick={handleGetStarted}
                        onMouseEnter={(e) => {
                            e.target.style.transform = 'scale(1.02)';
                            e.target.style.boxShadow = '0 20px 60px rgba(70, 54, 113, 0.4)';
                        }}
                        onMouseLeave={(e) => {
                            e.target.style.transform = 'scale(1)';
                            e.target.style.boxShadow = '0 10px 40px rgba(70, 54, 113, 0.3)';
                        }}
                    >
                        <span style={styles.ctaIcon}>✨</span>
                        Upload your document
                    </button>

                    <p style={styles.helperText}>
                        .docx files only • Takes ~10 seconds • Free to try
                    </p>
                </div>

                {/* Stacked cards visual */}
                <div style={styles.visualSection}>
                    <div style={styles.cardStack}>
                        <div style={{ ...styles.stackCard, ...styles.stackCard3 }}>
                            <div style={styles.cardHeader}>
                                <div style={styles.dots}>
                                    <span style={styles.dot}></span>
                                    <span style={styles.dot}></span>
                                    <span style={styles.dot}></span>
                                </div>
                                <span style={styles.cardLabel}>Messy Input</span>
                            </div>
                            <div style={styles.cardContent}>
                                <div style={{ ...styles.textLine, width: '90%', height: '6px', background: '#ef4444' }}></div>
                                <div style={{ ...styles.textLine, width: '75%', height: '10px', background: '#f97316' }}></div>
                                <div style={{ ...styles.textLine, width: '85%', height: '7px', background: '#eab308' }}></div>
                                <div style={{ ...styles.textLine, width: '60%', height: '12px', background: '#ef4444' }}></div>
                            </div>
                        </div>

                        <div style={{ ...styles.stackCard, ...styles.stackCard2 }}>
                            <div style={styles.cardHeader}>
                                <div style={styles.dots}>
                                    <span style={styles.dot}></span>
                                    <span style={styles.dot}></span>
                                    <span style={styles.dot}></span>
                                </div>
                                <span style={styles.cardLabel}>Processing...</span>
                            </div>
                            <div style={styles.cardContent}>
                                <div style={{ ...styles.textLine, width: '85%', height: '8px', background: '#8b7db8', opacity: 0.6 }}></div>
                                <div style={{ ...styles.textLine, width: '80%', height: '8px', background: '#8b7db8', opacity: 0.6 }}></div>
                                <div style={{ ...styles.textLine, width: '85%', height: '8px', background: '#8b7db8', opacity: 0.6 }}></div>
                            </div>
                        </div>

                        <div style={{ ...styles.stackCard, ...styles.stackCard1 }}>
                            <div style={styles.cardHeader}>
                                <div style={styles.dots}>
                                    <span style={{ ...styles.dot, background: '#10b981' }}></span>
                                    <span style={styles.dot}></span>
                                    <span style={styles.dot}></span>
                                </div>
                                <span style={styles.cardLabel}>Clean Output ✓</span>
                            </div>
                            <div style={styles.cardContent}>
                                <div style={{ ...styles.textLine, width: '85%', height: '8px', background: '#463671' }}></div>
                                <div style={{ ...styles.textLine, width: '80%', height: '8px', background: '#463671' }}></div>
                                <div style={{ ...styles.textLine, width: '85%', height: '8px', background: '#463671' }}></div>
                                <div style={{ ...styles.textLine, width: '70%', height: '8px', background: '#463671' }}></div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Features */}
                <div style={styles.features}>
                    <h2 style={styles.featuresTitle}>What it does</h2>

                    <div style={styles.featureGrid}>
                        {[
                            {
                                emoji: '🎯',
                                title: 'Fixes AI output',
                                desc: "ChatGPT documents look weird in Word. We fix the formatting automatically so you don't have to."
                            },
                            {
                                emoji: '⚡',
                                title: 'Actually fast',
                                desc: 'Upload your file, wait about 10 seconds, download. No complicated settings or waiting around.'
                            },
                            {
                                emoji: '✨',
                                title: 'Makes it consistent',
                                desc: 'Proper fonts, spacing, headings. All the boring stuff that makes documents look professional.'
                            }
                        ].map((feature, i) => (
                            <div
                                key={i}
                                style={{
                                    ...styles.featureCard,
                                    transform: hoveredCard === i ? 'translateY(-8px)' : 'translateY(0)',
                                }}
                                onMouseEnter={() => setHoveredCard(i)}
                                onMouseLeave={() => setHoveredCard(null)}
                            >
                                <div style={styles.featureEmoji}>{feature.emoji}</div>
                                <h3 style={styles.featureTitle}>{feature.title}</h3>
                                <p style={styles.featureDesc}>{feature.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <style>{`
                @media (max-width: 768px) {
                    .hero-title {
                        font-size: 2.5rem !important;
                    }
                    .hero-subtitle {
                        font-size: 1rem !important;
                    }
                    .main-cta {
                        padding: 14px 28px !important;
                        font-size: 1rem !important;
                    }
                    .feature-grid {
                        grid-template-columns: 1fr !important;
                    }
                    .card-stack {
                        width: 100% !important;
                        max-width: 400px !important;
                    }
                    .stack-card {
                        padding: 16px !important;
                    }
                    .logo-text {
                        font-size: 1.1rem !important;
                    }
                    .logo-circle {
                        width: 32px !important;
                        height: 32px !important;
                        font-size: 1rem !important;
                    }
                }
                
                @media (max-width: 480px) {
                    .hero-title {
                        font-size: 2rem !important;
                    }
                    .container {
                        padding: 0 16px !important;
                    }
                    .features-title {
                        font-size: 1.75rem !important;
                    }
                    .feature-emoji {
                        font-size: 2.5rem !important;
                    }
                }
            `}</style>
        </div>
    );
}

const styles = {
    wrapper: {
        minHeight: "100vh",
        background: "linear-gradient(180deg, #FBEFFA 0%, #EBBAF2 50%, #FBEFFA 100%)",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        overflowX: "hidden",
    },
    container: {
        maxWidth: "1100px",
        margin: "0 auto",
        padding: "0 24px",
    },
    nav: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "24px 0",
    },
    logo: {
        display: "flex",
        alignItems: "center",
        gap: "10px",
    },
    logoCircle: {
        width: "36px",
        height: "36px",
        borderRadius: "50%",
        background: "linear-gradient(135deg, #463671 0%, #6b4e9e 100%)",
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: "700",
        fontSize: "1.1rem",
    },
    logoText: {
        fontSize: "1.3rem",
        fontWeight: "700",
        color: "#463671",
    },
    hero: {
        textAlign: "center",
        padding: "40px 0 40px",
    },
    title: {
        fontSize: "4rem",
        fontWeight: "700",
        color: "#463671",
        lineHeight: "1.1",
        marginBottom: "24px",
        letterSpacing: "-0.03em",
    },
    titleGradient: {
        background: "linear-gradient(135deg, #463671 0%, #8b7db8 50%, #463671 100%)",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
        backgroundClip: "text",
    },
    subtitle: {
        fontSize: "1.2rem",
        color: "#6b5491",
        lineHeight: "1.7",
        marginBottom: "40px",
        maxWidth: "600px",
        margin: "0 auto 40px",
    },
    mainCta: {
        background: "linear-gradient(135deg, #463671 0%, #6b4e9e 100%)",
        color: "#fff",
        border: "none",
        borderRadius: "14px",
        padding: "18px 40px",
        fontSize: "1.1rem",
        fontWeight: "600",
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        gap: "10px",
        transition: "all 0.3s ease",
        boxShadow: "0 10px 40px rgba(70, 54, 113, 0.3)",
    },
    ctaIcon: {
        fontSize: "1.3rem",
    },
    helperText: {
        fontSize: "0.9rem",
        color: "#9b7ec4",
        marginTop: "16px",
    },
    visualSection: {
        display: "flex",
        justifyContent: "center",
        padding: "40px 0 0px",
        perspective: "1000px",
    },
    cardStack: {
        position: "relative",
        width: "500px",
        height: "230px",
    },
    stackCard: {
        position: "absolute",
        width: "100%",
        background: "#FBEFFA",
        borderRadius: "16px",
        padding: "24px",
        boxShadow: "0 10px 40px rgba(70, 54, 113, 0.15)",
        border: "1px solid #EBBAF2",
        transition: "all 0.6s ease",
    },
    stackCard1: {
        top: "0",
        left: "0",
        transform: "translateY(0) scale(1)",
        zIndex: 3,
    },
    stackCard2: {
        top: "0",
        left: "0",
        transform: "translateY(20px) scale(0.95)",
        opacity: 0.7,
        zIndex: 2,
    },
    stackCard3: {
        top: "0",
        left: "0",
        transform: "translateY(40px) scale(0.9)",
        opacity: 0.4,
        zIndex: 1,
    },
    cardHeader: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "20px",
    },
    dots: {
        display: "flex",
        gap: "6px",
    },
    dot: {
        width: "12px",
        height: "12px",
        borderRadius: "50%",
        background: "#d4a8e8",
    },
    cardLabel: {
        fontSize: "0.85rem",
        fontWeight: "600",
        color: "#6b5491",
    },
    cardContent: {
        display: "flex",
        flexDirection: "column",
        gap: "12px",
    },
    textLine: {
        borderRadius: "6px",
        opacity: 0.8,
    },
    features: {
        padding: "0 0 60px",
    },
    featuresTitle: {
        fontSize: "2rem",
        fontWeight: "700",
        color: "#463671",
        textAlign: "center",
        marginBottom: "40px",
    },
    featureGrid: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
        gap: "32px",
    },
    featureCard: {
        background: "#FBEFFA",
        borderRadius: "16px",
        padding: "32px 28px",
        border: "1px solid #EBBAF2",
        transition: "all 0.3s ease",
        cursor: "default",
    },
    featureEmoji: {
        fontSize: "3rem",
        marginBottom: "16px",
    },
    featureTitle: {
        fontSize: "1.25rem",
        fontWeight: "700",
        color: "#463671",
        marginBottom: "12px",
    },
    featureDesc: {
        fontSize: "0.95rem",
        color: "#6b5491",
        lineHeight: "1.6",
    },
};

export default LandingPage;
