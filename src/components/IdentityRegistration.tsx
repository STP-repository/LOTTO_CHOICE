import {useEffect,useRef,useState} from 'react';
import {renameProfile,personalStorage} from '../services/profiles';
export default function IdentityRegistration({onComplete,onCancel}:{onComplete:()=>void;onCancel:()=>void}){
 const dialog=useRef<HTMLDialogElement>(null),[name,setName]=useState(''),[error,setError]=useState('');
 useEffect(()=>{dialog.current?.showModal();return()=>dialog.current?.close();},[]);
 return <dialog ref={dialog} className="profile-dialog" onCancel={onCancel}><h2>아이디 생성</h2><p>한 번 등록하면 다음 방문부터 바로 시작할 수 있어요.</p><form onSubmit={e=>{e.preventDefault();try{renameProfile(name);personalStorage.setItem('identity:registered:v1','yes');(document.activeElement as HTMLElement)?.blur();onComplete();}catch(err){setError(String(err));}}}><label>사용할 아이디<input autoFocus value={name} onChange={e=>setName(e.target.value)} maxLength={20} required autoComplete="nickname" enterKeyHint="done" style={{fontSize:16}} placeholder="1~20자 이름 또는 별명"/></label>{error&&<p role="alert">{error}</p>}<button className="btn btn-primary">등록하고 시작하기</button><button type="button" className="btn btn-white" onClick={onCancel}>취소</button></form><p>이 기기·브라우저에 저장됩니다.</p></dialog>;
}
