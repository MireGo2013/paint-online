import { useEffect, useRef, type FormEvent } from 'react'
import styles from './UsernameModal.module.scss'

type Props = {
  onSubmit: (username: string) => void
}

const UsernameModal = ({ onSubmit }: Props) => {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    dialog?.showModal()
    return () => dialog?.close()
  }, [])

  const submitHandler = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const username = inputRef.current?.value.trim()
    if (username) onSubmit(username)
  }

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      closedby="none"
      onCancel={(e) => e.preventDefault()}
    >
      <form className={styles.form} onSubmit={submitHandler}>
        <h3 className={styles.title}>Введите ваше имя</h3>
        <input ref={inputRef} className={styles.input} type="text" required autoFocus />
        <button className={styles.button} type="submit">
          Войти
        </button>
      </form>
    </dialog>
  )
}

export default UsernameModal
