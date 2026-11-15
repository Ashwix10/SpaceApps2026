"""Convert the official CC0 MakeHuman hm08 mesh to a small, local GLB. No runtime download.
Usage: python scripts/prepare-human.py path/to/base.obj
"""
import argparse
from collections import defaultdict
import hashlib
import json
import math
from pathlib import Path
import struct

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument('source', type=Path)
parser.add_argument('--male', action='store_true', help='Prepare a static male-proportioned reference illustration')
args = parser.parse_args()
raw = args.source.read_bytes()
vertices = []
faces = []
group = ''
for line in raw.decode('utf-8').splitlines():
    if line.startswith('v '):
        vertices.append(tuple(map(float, line.split()[1:4])))
    elif line.startswith('g '):
        group = line[2:]
    elif line.startswith('f ') and group in ('body', 'helper-l-eye', 'helper-r-eye'):
        faces.append([int(v.split('/')[0]) - 1 for v in line.split()[1:]])
used = sorted({i for face in faces for i in face})
lookup = {old: new for new, old in enumerate(used)}
low = min(vertices[i][1] for i in used)
high = max(vertices[i][1] for i in used)
scale = 3.2 / (high-low)
points = [(vertices[i][0]*scale, (vertices[i][1]-low)*scale, (vertices[i][2]-.3)*scale) for i in used]
if args.male:
    def bell(value, center, width):
        return math.exp(-((value-center)/width)**2)
    shaped = []
    for x,y,z in points:
        # Fixed art-direction edits to the CC0 mesh, never driven by forecast values.
        shoulder = bell(y, 2.44, .29)
        hip = bell(y, 1.70, .29)
        x *= 1 + .22*shoulder - .13*hip + .08*bell(y, 1.98, .20)
        torso = math.exp(-(abs(x)/.34)**8)
        front = max(0, min(1, (z-.02)/.12))
        breast = bell(abs(x), .17, .17)*bell(y, 2.17, .14)
        z -= .105*breast*front*torso
        # Broad pectorals, a firmer abdomen and a slightly stronger jaw silhouette.
        z += .025*bell(abs(x), .16, .17)*bell(y, 2.30, .14)*front*torso
        z += .012*bell(abs(x), .08, .07)*bell(y, 1.99, .18)*front*torso
        # Replace the base mesh's rounded breast volume with a broad chest plane.
        chest_blend = math.exp(-((y-2.30)/.31)**4)*torso*max(0,min(1,(z+.02)/.06))
        chest_surface = .16*math.sqrt(max(.15, 1-(x/.43)**2)) + .012*bell(y,2.30,.18)
        z = z*(1-chest_blend) + chest_surface*chest_blend
        x *= 1+.10*bell(y, 2.89, .07)+.08*bell(y, 2.70, .10)
        shaped.append((x,y,z))
    points = shaped
triangles = []
for face in faces:
    for n in range(1, len(face)-1):
        triangles.extend((lookup[face[0]], lookup[face[n]], lookup[face[n+1]]))
normals = [[0.,0.,0.] for _ in points]
for n in range(0,len(triangles),3):
    a,b,c = (points[triangles[n+j]] for j in range(3))
    u = [b[k]-a[k] for k in range(3)]
    v = [c[k]-a[k] for k in range(3)]
    normal = (u[1]*v[2]-u[2]*v[1], u[2]*v[0]-u[0]*v[2], u[0]*v[1]-u[1]*v[0])
    for j in range(3):
        for k in range(3): normals[triangles[n+j]][k] += normal[k]
for normal in normals:
    length = math.sqrt(sum(v*v for v in normal)) or 1
    for k in range(3): normal[k] /= length
pos = struct.pack('<'+'f'*len(points)*3, *(v for point in points for v in point))
norm = struct.pack('<'+'f'*len(points)*3, *(v for normal in normals for v in normal))
indices = struct.pack('<'+'I'*len(triangles), *triangles)
binary = pos+norm+indices
asset = {'asset': {'version':'2.0','generator':'AstroTwin: MakeHuman CC0 male reference' if args.male else 'AstroTwin: MakeHuman CC0 surface conversion','copyright':'MakeHuman Community, CC0 1.0'},
 'scene':0,'scenes':[{'nodes':[0]}], 'nodes':[{'mesh':0,'name':'MakeHuman reference surface'}],
 'meshes':[{'primitives':[{'attributes':{'POSITION':0,'NORMAL':1},'indices':2,'material':0}]}],
 'materials':[{'name':'Porcelain','pbrMetallicRoughness':{'baseColorFactor':[.7,.7,.7,1],'metallicFactor':.05,'roughnessFactor':.45}}],
 'buffers':[{'byteLength':len(binary)}],
 'bufferViews':[{'buffer':0,'byteOffset':0,'byteLength':len(pos),'target':34962},{'buffer':0,'byteOffset':len(pos),'byteLength':len(norm),'target':34962},{'buffer':0,'byteOffset':len(pos)+len(norm),'byteLength':len(indices),'target':34963}],
 'accessors':[{'bufferView':0,'componentType':5126,'count':len(points),'type':'VEC3','min':[min(p[k] for p in points) for k in range(3)],'max':[max(p[k] for p in points) for k in range(3)]},{'bufferView':1,'componentType':5126,'count':len(points),'type':'VEC3'},{'bufferView':2,'componentType':5125,'count':len(triangles),'type':'SCALAR'}]}
encoded = json.dumps(asset,separators=(',',':')).encode()
encoded += b' '*((-len(encoded))%4)
binary += b'\0'*((-len(binary))%4)
glb = struct.pack('<III',0x46546c67,2,12+8+len(encoded)+8+len(binary))+struct.pack('<II',len(encoded),0x4e4f534a)+encoded+struct.pack('<II',len(binary),0x004e4942)+binary
out = ROOT/'web/public/models';out.mkdir(parents=True,exist_ok=True)
(out/'human-reference.glb').write_bytes(glb)
notice = {'name':'MakeHuman hm08 base mesh','creator':'MakeHuman Community / Data Collection AB / Joel Palmius / Jonas Hauquier',
 'source':'https://github.com/makehumancommunity/makehuman/blob/master/makehuman/data/3dobjs/base.obj',
 'license':'CC0 1.0 Universal','license_url':'https://creativecommons.org/publicdomain/zero/1.0/',
 'license_statement':'https://github.com/makehumancommunity/makehuman/blob/master/LICENSE.md',
 'source_sha256':hashlib.sha256(raw).hexdigest(),'asset_sha256':hashlib.sha256(glb).hexdigest(),
 'modifications':'Removed rig/clothing helpers; kept surface and eye spheres; normalized height; triangulated and recomputed smooth normals; converted to GLB. No textures or personal scan data.' + (' Static male illustration edits: broader shoulders, narrower hips, flatter chest, pectoral/abdominal contour and jaw shaping. These are AstroTwin edits, not official MakeHuman morph targets or measured anatomy.' if args.male else ''),
 'purpose':'Generic illustration. Not a NASA body scan, medical reconstruction or measurement of anatomy.',
 'vertices':len(points),'triangles':len(triangles)//3}
(out/'human-reference.source.json').write_text(json.dumps(notice,indent=2)+'\n',encoding='utf-8')
(out/'NOTICE.txt').write_text(raw.decode().split('v ')[0]+'\nLicense: CC0 1.0 Universal\nhttps://creativecommons.org/publicdomain/zero/1.0/\nSource and modifications: human-reference.source.json\n',encoding='utf-8')
print(f'Prepared {len(points)} vertices, {len(triangles)//3} triangles, {len(glb)} bytes')
