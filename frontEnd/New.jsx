import axios from 'axios';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const New = () => {
  const navigate = useNavigate();
  const [credentials, setCredentials] = useState({ email: '', password: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsLoading(true);
    setErrorMsg('');
    try {
      const { data } = await axios.post('/api/v1/user-login', credentials);
      if (data.user?.isSuspended) throw new Error('Your account is suspended. Contact customer care.');
      navigate(data.user?.role === 'ADMIN' ? '/admin/dashboard' : '/');
    } catch (error) {
      setErrorMsg(error.response?.data?.message || error.message || 'Unable to sign in.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input name="email" type="email" value={credentials.email} onChange={(event) => setCredentials({ ...credentials, email: event.target.value })} />
      <input name="password" type="password" value={credentials.password} onChange={(event) => setCredentials({ ...credentials, password: event.target.value })} />
      <button type="submit" disabled={isLoading}>{isLoading ? 'Signing in…' : 'Sign in'}</button>
      {errorMsg && <p role="alert">{errorMsg}</p>}
    </form>
  );
};

export default New;
