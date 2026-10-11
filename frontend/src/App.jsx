import './App.css'
import { Navigate, Route, Routes } from 'react-router-dom'
import {WallpaperProvider} from './context/WallpaperContext';
import {ThemeProvider} from './context/ThemeContext'
import  AuthPage from './pages/AuthPage'
import  ChatPage from './pages/ChatPage'
import {useAuth} from '@clerk/react';

function App() {

  const {isLoaded,isSignedIn} = useAuth(); 

  if(!isLoaded) return <p>loading...</p>

  return (
  <ThemeProvider>
    <WallpaperProvider>
 <Routes>
  <Route path="/" element={ isSignedIn ? <ChatPage/> :<Navigate to={"/auth"} replace /> } />
  <Route path="/auth" element={! isSignedIn ? <AuthPage/> : <Navigate to={"/chat"} replace /> } />
 </Routes>
      </WallpaperProvider>
  </ThemeProvider>

  )
}

export default App
