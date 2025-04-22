import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./Auth.css";

export default function Login() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState({});
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.email) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Email is invalid";
    }
    
    if (!formData.password) {
      newErrors.password = "Password is required";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (validateForm()) {
      // For demo purposes, we'll simulate a successful login
      // In a real app, you would validate against your backend
      const users = JSON.parse(localStorage.getItem("users") || "[]");
      const user = users.find(
        (u) => u.email === formData.email && u.password === formData.password
      );
      
      if (user) {
        localStorage.setItem("currentUser", JSON.stringify(user));
        navigate("/dashboard");
      } else {
        setErrors({ form: "Invalid email or password" });
      }
    }
  };
