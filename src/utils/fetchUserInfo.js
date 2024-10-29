// src/utils/fetchUserInfo.js
import { ref } from 'vue';
import { getUserInfo } from './apiAuth'; 

export function useFetchUserInfo() {
  const user = ref(null);
  const errorMessage = ref('');

  const fetchUserInfo = async () => {
    errorMessage.value = '';
    try {
      const result = await getUserInfo();
      user.value = result.data;
    } catch (error) {
      console.error('Erro ao obter informações do usuário:', error);
      errorMessage.value = 'Erro ao carregar informações do usuário.';
    }
  };

  return { user, errorMessage, fetchUserInfo };
}
