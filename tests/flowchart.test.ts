import { describe, it, expect } from 'vitest';
import '../src/languages';
import { sourceToFlowchart } from '../src/core/conversion/converter';
import { layoutFlowGraph } from '../src/core/flow/flow-layout';

describe('Flowchart Layout and Generation', () => {
  it('generates flow graph and computes ELK layout for complex branching and looping', async () => {
    const code = `
#include <stdio.h>

int main() {
    int x = 0;
    while (x < 10) {
        if (x % 2 == 0) {
            printf("Even: %d\\n", x);
        } else {
            printf("Odd: %d\\n", x);
        }
        x++;
    }
    return 0;
}
`;
    const flowRes = sourceToFlowchart(code, 'c');
    expect(flowRes.success).toBe(true);
    expect(flowRes.flowProgram?.graphs.length).toBe(1);

    const graph = flowRes.flowProgram!.graphs[0];
    expect(graph.nodes.length).toBeGreaterThan(5);
    expect(graph.edges.length).toBeGreaterThan(5);

    // Test ELK Layout computation
    const layout = await layoutFlowGraph(graph);
    expect(layout.nodes.length).toBe(graph.nodes.length);
    expect(layout.edges.length).toBe(graph.edges.length);
    expect(layout.width).toBeGreaterThan(0);
    expect(layout.height).toBeGreaterThan(0);

    // Verify positioned node coordinates
    for (const node of layout.nodes) {
      expect(typeof node.x).toBe('number');
      expect(typeof node.y).toBe('number');
      expect(node.width).toBeGreaterThan(0);
      expect(node.height).toBeGreaterThan(0);
    }
  });
});
