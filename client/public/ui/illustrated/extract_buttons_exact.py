from PIL import Image
import numpy as np
from scipy.ndimage import gaussian_filter, label, binary_dilation
from pathlib import Path
import zipfile
src=Path('/mnt/data/a_clean_high_resolution_transparent_background.png')
out=Path('/mnt/data/arcane_precise_original_buttons');out.mkdir(exist_ok=True)
img=np.array(Image.open(src).convert('RGBA'))
a=img[:,:,3].astype(float)/255
# Wide seam follows low-opacity transparent bands and very dark plaque-shadow gaps.
# A dynamic programming optimization enforces continuous boundaries without straight rectangular cuts.
def seam(y0, xa, xb, radius=11):
 ys=np.arange(y0-radius,y0+radius+1)
 xs=np.arange(xa,xb)
 # use transparency as chief indicator, favor nearby center and shadow darkness over brightness
 rgb=img[ys[:,None],xs[None,:],:3].astype(float)
 alpha=a[ys[:,None],xs[None,:]]
 lum=rgb.mean(axis=2)/255
 cost=3.0*alpha + .40*lum*alpha + .025*(ys[:,None]-y0)**2
 # edges have decorative leafy vines, so centerline preference mildly stronger than zero-alpha chasing.
 n=len(ys);m=len(xs)
 dp=np.zeros((n,m));ptr=np.zeros((n,m),dtype=np.int8);dp[:,0]=cost[:,0]
 for j in range(1,m):
  for k in range(n):
   lo=max(0,k-2);hi=min(n,k+3); ar=dp[lo:hi,j-1]+.11*np.abs(np.arange(lo,hi)-k)
   z=np.argmin(ar);dp[k,j]=cost[k,j]+ar[z];ptr[k,j]=lo+z
 k=int(np.argmin(dp[:,-1]));path=np.zeros(m,dtype=np.int32)
 for j in range(m-1,-1,-1):
  path[j]=ys[k]
  if j:k=int(ptr[k,j])
 return xs,path
# Main body coordinates from source, not regenerated artwork.
left=[('duel',365,441),('practice',441,517),('spellbook',517,594),('settings',594,672)]
right=[('create-lobby',526,608),('join-lobby',608,713)]
# Match masks to seams, and keep RGB samples exactly from original.
# Extra top and bottom margins are handled by clearing unrelated components.
def build(name,x0,x1,y0,y1,top,bottom):
 crop=img[y0:y1,x0:x1].copy();h,w=crop.shape[:2]
 # crop passed with y0 <= content minimum, cap seam not to clip any natural feather by retaining boundary pixels
 yy=np.arange(y0,y1)[:,None]
 mask=np.ones((h,w),bool)
 if top is not None:mask &= yy>=top[None,:]
 if bottom is not None:mask &= yy<bottom[None,:]
 mask &= crop[:,:,3]>=6
 # keep primary connected foreground island and small adjacent art fragments within the same sign, not unrelated pieces.
 # ALPHA contains decorative fine detached details; remove only components < 12 px and beyond main body.
 crop[:,:,3][~mask]=0
 valid=crop[:,:,3]>15
 labs,num=label(valid)
 sizes=np.bincount(labs.ravel());large=sizes[1:]>12
 keep=np.zeros(num+1,bool);keep[1:]=large
 crop[:,:,3][~keep[labs]]=0
 # Trim to true alpha footprint, with a few transparent safety pixels.
 yy2,xx2=np.where(crop[:,:,3]>6)
 assert len(xx2)>1000,name
 bbox=(max(0,xx2.min()-3),max(0,yy2.min()-3),min(w,xx2.max()+4),min(h,yy2.max()+4))
 result=Image.fromarray(crop).crop(bbox)
 result.save(out/(name+'.png'),optimize=True)
 print(name,result.size,'alpha pixels',np.count_nonzero(np.asarray(result)[:,:,3]))
 return result
# Each seam computed over full horizontal button span, plus extended to edges.
sl=[]
for y in (451,529,608,685):
 xs,ys=seam(y,15,388,5)
 full=np.interp(np.arange(0,400),xs,ys).astype(int)
 sl.append(full)
sr=[]
for y in (621,):
 xs,ys=seam(y,1380,1760,5)
 full=np.interp(np.arange(1360,1770),xs,ys).astype(int)
 sr.append(full)
# Only buttons requested, but seam to Quit defines Settings boundary.
for name,yt,yb,ti,bi in [('duel',369,462,None,0),('practice',439,540,0,1),('spellbook',520,620,1,2),('settings',598,698,2,3)]:
 build(name,15,390,yt,yb,None if ti is None else sl[ti][15:390],sl[bi][15:390])
for name,yt,yb,ti,bi in [('create-lobby',540,632,None,0),('join-lobby',609,713,0,None)]:
 build(name,1380,1763,yt,yb,None if ti is None else sr[ti][20:403],None if bi is None else sr[bi][20:403])
# Contact sheet with plenty of separation and alpha checker to inspect per-pixel quality.
buttons=[Image.open(out/(n+'.png')) for n in ['duel','practice','spellbook','settings','create-lobby','join-lobby']]
canvas=Image.new('RGBA',(1040,560),(38,46,58,255))
for i,b in enumerate(buttons):
 x=40+(i%2)*525;y=35+(i//2)*180
 canvas.alpha_composite(b,(x,y))
canvas.convert('RGB').save('/mnt/data/arcane_precise_button_preview.png')
with zipfile.ZipFile('/mnt/data/arcane_precise_original_buttons.zip','w',zipfile.ZIP_DEFLATED) as z:
 for f in sorted(out.glob('*.png')):z.write(f,arcname=f.name)
