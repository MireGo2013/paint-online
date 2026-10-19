import toolState from '../../store/toolState.ts'
import styles from './SettingBar.module.scss'

const SettingBar = () => {
  return (
    <div className={styles.settingBar}>
      <label htmlFor="line-width">Толщина линии</label>
      <input
        id="line-width"
        className={styles.lineWidth}
        type="number"
        defaultValue={1}
        min={1}
        max={50}
        onChange={(e) => {
          const width = e.target.valueAsNumber
          if (width > 0) toolState.setLineWidth(width)
        }}
      />
      <label htmlFor="stroke-color">Цвет обводки</label>
      <input
        id="stroke-color"
        type="color"
        onChange={(e) => toolState.setStrokeColor(e.target.value)}
      />
    </div>
  )
}

export default SettingBar
