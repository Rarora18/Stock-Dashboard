import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import Dashboard from './components/Dashboard'
import Chart from './components/Chart'
function App() {
  return (
    <div>
      <h1 className=''>Stock Dashboard</h1>
      <Dashboard />
      <Chart />

    </div>
  )
}

export default App
