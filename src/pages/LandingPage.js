import React from "react";
import { useNavigate } from "react-router-dom";


function LandingPage() {
    const navigate = useNavigate();

    return (
        <div style={styles.container}>
            <h1 style={styles.title}>📄 DOCX Optimizer</h1>
            <p style={styles.subtitle}>
                Turn your messy or AI-generated Word documents into clean, professional files — automatically.
            </p>
            <button style={styles.button} onClick={() => navigate("/format")}>
                Get Started
            </button>
        </div>
    );
}

const styles = {
    container: {
        textAlign: "center",
        marginTop: "10%",
        fontFamily: "Arial, sans-serif",
    },
    title: {
        fontSize: "2.8rem",
        fontWeight: "bold",
        color: "#2d3748",
    },
    subtitle: {
        fontSize: "1.2rem",
        color: "#4a5568",
        marginTop: "10px",
    },
    button: {
        marginTop: "40px",
        backgroundColor: "#4f46e5",
        color: "#fff",
        border: "none",
        padding: "12px 28px",
        fontSize: "1rem",
        borderRadius: "8px",
        cursor: "pointer",
    },
};

export default LandingPage;
