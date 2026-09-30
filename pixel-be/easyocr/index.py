import easyocr
reader = easyocr.Reader(['en'])
result=reader.readtext('image.png',detail=0)
# print(result)
# text=result[0][1]
# print(text)
for line in result:
    print(line)



full_text = "\n".join(result)
print(full_text)