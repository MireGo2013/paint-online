import { observer } from 'mobx-react-lite'
import { useParams } from 'react-router'
import Canvas from '../../components/Canvas/Canvas.tsx'
import SettingBar from '../../components/SettingBar/SettingBar.tsx'
import Toolbar from '../../components/Toolbar/Toolbar.tsx'
import UsernameModal from '../../components/UsernameModal/UsernameModal.tsx'
import { useSessionSocket } from '../../hooks/useSessionSocket.ts'
import canvasState from '../../store/canvasState.ts'

const PaintPage = observer(() => {
  const { id } = useParams<{ id: string }>()
  useSessionSocket(id, canvasState.username)

  return (
    <>
      {!canvasState.username && (
        <UsernameModal onSubmit={(username) => canvasState.setUsername(username)} />
      )}
      <Toolbar />
      <SettingBar />
      <Canvas />
    </>
  )
})

export default PaintPage
