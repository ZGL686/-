from PIL import Image, ImageDraw
im=Image.new('RGBA',(256,256),(0,0,0,0))
d=ImageDraw.Draw(im)
d.rounded_rectangle((0,0,255,255),radius=55,fill='#37352f')
d.line([(72,72),(72,188),(188,188)],fill='#ffffff',width=15)
d.rectangle((113,69,188,148),outline='#ffffff',width=15)
d.line([(113,109),(188,109)],fill='#ffffff',width=12)
im.save('src-tauri/icons/icon.ico',sizes=[(16,16),(32,32),(48,48),(64,64),(128,128),(256,256)])
