export function parseOsimSkeleton(osimXml) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(osimXml, 'application/xml');
  
  // 解析骨骼结构（简化版）
  const bones = Array.from(doc.getElementsByTagName('Body')).map(body => ({
    name: body.getAttribute('name'),
    mass: parseFloat(body.getAttribute('mass') || '0'),
    position: Array.from(body.getElementsByTagName('Translation'))[0]?.getAttribute('xyz')?.split(' ').map(Number) || [0, 0, 0]
  }));

  // 解析关节（简化版）
  const joints = Array.from(doc.getElementsByTagName('Joint')).map(joint => ({
    name: joint.getAttribute('name'),
    type: joint.getAttribute('type'),
    parent: joint.getAttribute('parent_body'),
    child: joint.getAttribute('child_body'),
    axis: Array.from(joint.getElementsByTagName('Axis'))[0]?.getAttribute('xyz')?.split(' ').map(Number) || [1, 0, 0]
  }));

  return { bones, joints };
}

export function parseMotionData(motContent) {
  const lines = motContent.split('\n').filter(line => line.trim() && !line.startsWith('\t'));
  const header = lines[0].split(/\s+/).filter(col => col);
  const data = lines.slice(1).map(line => {
    const values = line.split(/\s+/).map(Number);
    return header.reduce((frame, key, index) => {
      frame[key] = values[index];
      return frame;
    }, {});
  });
  return data;
}