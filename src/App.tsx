import { useState } from 'react'
import ParentPage from './pages/ParentPage'
import ChildPage from './pages/ChildPage'

function App() {
  const [view, setView] = useState<'parent' | 'child'>('parent')

  if (view === 'child') {
    return <ChildPage onToggleToParent={() => setView('parent')} />
  }

  return <ParentPage onToggleToChild={() => setView('child')} />
}

export default App
