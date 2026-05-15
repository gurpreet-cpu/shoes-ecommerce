import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setCredentials } from '../../store/authSlice';
import axiosInstance from '../../lib/axios';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

export default function GoogleSuccessPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  useEffect(() => {
    const handleGoogleSuccess = async () => {
      const token = searchParams.get('token');

      if (!token) {
        navigate('/login?error=no_token');
        return;
      }

      try {
        localStorage.setItem('accessToken', token);

        const res = await axiosInstance.get('/auth/me', {
          headers: { Authorization: `Bearer ${token}` },
        });

        dispatch(setCredentials({
          user: res.data.data,
          accessToken: token,
        }));

        navigate('/');
      } catch {
        navigate('/login?error=google_failed');
      }
    };

    handleGoogleSuccess();
  }, []);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <LoadingSpinner variant="dots" />
        <p className="mt-4 text-textSecondary font-body">
          Signing you in with Google...
        </p>
      </div>
    </div>
  );
}
