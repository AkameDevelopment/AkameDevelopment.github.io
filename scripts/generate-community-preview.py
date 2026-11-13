from PIL import Image, ImageDraw, ImageFont, ImageFilter
import math, os
W,H=1200,630
im=Image.new("RGB",(W,H))
p=im.load()
for y in range(H):
 for x in range(W):
  r=math.hypot((x-W*.5)/W,(y-H*.48)/H)
  glow=max(0,1-r*1.5)
  p[x,y]=(int(12+24*glow),int(7+8*glow),int(24+43*glow))
gl=Image.new("RGBA",(W,H));d=ImageDraw.Draw(gl)
for i in range(24):
 a=i/23
 pts=[]
 for x in range(-50,W+50,8):
  y=int(55+90*math.sin(x/230+.7)+i*4)
  pts.append((x,y))
 d.line(pts,fill=(146,66,255,int(2+8*(1-a))),width=2)
for i in range(24):
 pts=[]
 for x in range(-50,W+50,8):
  y=int(565+65*math.sin(x/230+1.3)-i*4)
  pts.append((x,y))
 d.line(pts,fill=(146,66,255,8),width=2)
im=Image.alpha_composite(im.convert("RGBA"),gl)
d=ImageDraw.Draw(im)
fontpath="/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
font=ImageFont.truetype(fontpath,76)
sub=ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",26)
title="AkameDevelopment"
bb=d.textbbox((0,0),title,font=font)
x=(W-(bb[2]-bb[0]))//2
d.text((x,265),"Akame",font=font,fill="#f9f5ff",stroke_width=0)
w=d.textlength("Akame",font=font)
d.text((x+w,265),"Development",font=font,fill="#b476ff")
label="C O M M U N I T Y"
lw=d.textlength(label,font=sub)
d.text(((W-lw)/2,376),label,font=sub,fill="#e3d2ff")
d.line((210,410,405,410),fill="#8e4bd0",width=2)
d.line((795,410,990,410),fill="#8e4bd0",width=2)
d.line((240,250,240,235,260,235),fill="#b46bff",width=3)
d.line((960,250,960,235,940,235),fill="#b46bff",width=3)
# Clean stylized A monogram above the wordmark
d.polygon([(600,88),(541,218),(566,218),(600,139),(634,218),(659,218)],fill="#a66aff")
d.line([(550,196),(650,169)],fill="#d1a4ff",width=7)
os.makedirs("assets",exist_ok=True)
im.convert("RGB").save("assets/community-preview.png",optimize=True)
