import re

p = 'src/data/artifacts.ts'
s = open(p, encoding='utf-8').read()
new = {
    'ch-life': 27, 'ch-royal': 29, 'ch-death': 25,
    'ch-mummification': 28, 'ch-journey': 27,
    'cf-outer': 19, 'cf-sky': 23, 'cf-words': 21,
    'st-stone': 25, 'st-pose': 28, 'st-memory': 24,
}
for cid, dur in new.items():
    pat = re.compile("id: '" + cid + "',.*?durationSec: \\d+", re.S)
    s, n = pat.subn(lambda m: m.group(0)[:m.group(0).rindex('durationSec: ') + len('durationSec: ')] + str(dur), s, count=1)
    assert n == 1, cid
open(p, 'w', encoding='utf-8').write(s)
print('synced', len(new))
