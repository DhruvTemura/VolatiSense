// src/components/auth/Signup.jsx
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import '../../styles/auth.css';

const Signup = () => {
  const navigate = useNavigate();
  const [signupError, setSignupError] = useState('');

  const initialValues = {
    fullName: '',
    email: '',
    password: '',
    confirmPassword: ''
  };

  const validationSchema = Yup.object({
    fullName: Yup.string()
      .required('Full name is required'),
    email: Yup.string()
      .email('Invalid email address')
      .required('Email is required'),
    password: Yup.string()
      .min(8, 'Password must be at least 8 characters')
      .required('Password is required'),
    confirmPassword: Yup.string()
      .oneOf([Yup.ref('password'), null], 'Passwords must match')
      .required('Confirm password is required')
  });

  const handleSubmit = (values, { setSubmitting }) => {
    // In a real application, you would make an API call here
    // For demonstration purposes, we'll simulate a successful signup
    setTimeout(() => {
      // Mock successful registration
      setSubmitting(false);
      navigate('/login');
    }, 1000);
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h2>Join VolatiSense</h2>
          <p>Create an account to start analyzing market risks</p>
        </div>

        {signupError && <div className="auth-error">{signupError}</div>}

        <Formik
          initialValues={initialValues}
          validationSchema={validationSchema}
          onSubmit={handleSubmit}
        >
          {({ isSubmitting }) => (
            <Form className="auth-form">
              <div className="form-group">
                <label htmlFor="fullName">Full Name</label>
                <Field type="text" name="fullName" id="fullName" className="form-control" />
                <ErrorMessage name="fullName" component="div" className="error-message" />
              </div>

              <div className="form-group">
                <label htmlFor="email">Email</label>
                <Field type="email" name="email" id="email" className="form-control" />
                <ErrorMessage name="email" component="div" className="error-message" />
              </div>

              <div className="form-group">
                <label htmlFor="password">Password</label>
                <Field type="password" name="password" id="password" className="form-control" />
                <ErrorMessage name="password" component="div" className="error-message" />
              </div>

              <div className="form-group">
                <label htmlFor="confirmPassword">Confirm Password</label>
                <Field type="password" name="confirmPassword" id="confirmPassword" className="form-control" />
                <ErrorMessage name="confirmPassword" component="div" className="error-message" />
              </div>

              <button 
                type="submit" 
                className="auth-button" 
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Creating Account...' : 'Create Account'}
              </button>
            </Form>
          )}
        </Formik>

        <div className="auth-footer">
          <p>Already have an account? <Link to="/login">Sign in</Link></p>
        </div>
      </div>
    </div>
  );
};

export default Signup;