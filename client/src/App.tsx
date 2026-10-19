import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import styles from './App.module.scss'
import PaintPage from './pages/PaintPage/PaintPage.tsx'
import { generateId } from './utils/generateId.ts'

const App = () => {
  return (
    <BrowserRouter>
      <div className={styles.app}>
        <Routes>
          <Route path="/:id" element={<PaintPage />} />
          <Route path="*" element={<Navigate to={`/${generateId()}`} replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}

export default App
