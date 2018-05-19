import axios from 'axios';

export const login = ({email, password}) => axios.post('/api/auth/login', {email, password});