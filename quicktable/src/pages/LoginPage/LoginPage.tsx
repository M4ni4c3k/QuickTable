import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import styles from './LoginPage.module.css';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, loading, error } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(email, password);
      navigate('/panel');
    } catch (err) {
      console.error('Login failed:', err);
    }
  };

  return (
    <div className={styles.loginContainer}>
      <h2>Logowanie do QuickTable</h2>
      <form onSubmit={handleSubmit} className={styles.loginForm}>
        {error && <p className={styles.error}>{error?.message}</p>}
        
        <div className={styles.formGroup}>
          <label>Email:</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className={styles.formGroup}>
          <label>Hasło:</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <button 
          type="submit" 
          disabled={loading}
          className={styles.loginButton}
        >
          {loading ? 'Logowanie...' : 'Zaloguj'}
        </button>
      </form>
    </div>
  );
};

export default LoginPage;