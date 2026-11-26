"""Scan pages for contours a grid collapses or distorts (area vs 1/60000 reference). Usage: tqp_degen.py tqp.py N files..."""
import sys
src=open(sys.argv[1]).read().replace('\nmain()\n','\n');g={};exec(src,g)
N=int(sys.argv[2]);REF=60000
def contours(segs):
    out=[];cur=[]
    for code,pts in segs:
        if code==0 and cur: out.append(cur);cur=[]
        cur+=pts
    if cur: out.append(cur)
    return out
def area(pts,n):
    a=0
    for (x1,y1),(x2,y2) in zip(pts,pts[1:]+pts[:1]): a+=x1*y2-x2*y1
    return a/2/(n*n)
worst=[];collapsed=0;total=0
for f in sys.argv[3:]:
    raw=open(f,'rb').read()
    r=contours(g['quantized'](raw,REF));q=contours(g['quantized'](raw,N))
    assert len(r)==len(q)
    for i,(cr,cq) in enumerate(zip(r,q)):
        total+=1
        ar=abs(area(cr,REF));aq=abs(area(cq,N))
        if len(set(cq))==1: collapsed+=1
        if ar>0: worst.append((abs(aq-ar)/ar, ar, f.split('/')[-1], i))
worst.sort(reverse=True)
big=[w for w in worst if w[1]>0.05]  # contours > 0.05 sq unit (dots are ~0.3-1)
print(f'N={N} contours={total} collapsed-to-point={collapsed} | >10% area change: {sum(1 for w in worst if w[0]>0.10)} (of which area>0.05: {sum(1 for w in big if w[0]>0.10)}) | >25%: {sum(1 for w in worst if w[0]>0.25)}')
print(' smallest ref areas:',sorted(w[1] for w in worst)[:3])
print(' worst (>0.05 area):',[(round(a,3),round(b,3),c,d) for a,b,c,d in big[:6]])
