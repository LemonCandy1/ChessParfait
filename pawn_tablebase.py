import time

class PawnTablebaseEngine:
    def __init__(self, width=4, height=4):
        self.W = width
        self.H = height
        self.table = {}  # Key: (white_bb, black_bb, turn, ep_square), Value: result
        
        # Results
        self.WIN = 1
        self.LOSS = -1
        self.DRAW = 0 

    def get_start_state(self):
        white_bb = 0
        black_bb = 0
        for i in range(self.W):
            white_bb |= (1 << (self.W + i)) # Second rank (index 1 * W)
            black_bb |= (1 << ((self.H - 2) * self.W + i)) # Penultimate rank
        return (white_bb, black_bb, 'W', -1)

    def print_board(self, white_bb, black_bb):
        print("\n  " + " ".join([chr(ord('a') + i) for i in range(self.W)]))
        for r in range(self.H - 1, -1, -1):
            row = f"{r+1} "
            for c in range(self.W):
                idx = r * self.W + c
                if (white_bb >> idx) & 1: row += "W "
                elif (black_bb >> idx) & 1: row += "B "
                else: row += ". "
            print(row + f" {r+1}")
        print("  " + " ".join([chr(ord('a') + i) for i in range(self.W)]) + "\n")

    def count_pawns(self, bb):
        return bin(bb).count('1')

    def get_moves(self, white_bb, black_bb, turn, ep_square):
        moves = []
        if turn == 'W':
            for i in range(self.W * self.H):
                if (white_bb >> i) & 1:
                    r, c = divmod(i, self.W)
                    # 1. Forward 1
                    nr = r + 1
                    if nr < self.H:
                        target = nr * self.W + c
                        if not ((white_bb | black_bb) >> target) & 1:
                            moves.append((white_bb ^ (1 << i) | (1 << target), black_bb, -1))
                            # 2. Forward 2 (from rank 2/index 1)
                            if r == 1:
                                target2 = (r + 2) * self.W + c
                                if not ((white_bb | black_bb) >> target2) & 1:
                                    moves.append((white_bb ^ (1 << i) | (1 << target2), black_bb, target))

                    # 3. Diagonal Captures
                    for dc in [-1, 1]:
                        nc = c + dc
                        if 0 <= nc < self.W:
                            target = (r + 1) * self.W + nc
                            # Standard Capture
                            if (black_bb >> target) & 1:
                                moves.append((white_bb ^ (1 << i) | (1 << target), black_bb ^ (1 << target), -1))
                            # En Passant
                            elif target == ep_square:
                                # Remove the black pawn behind the target
                                victim = (r) * self.W + nc
                                moves.append((white_bb ^ (1 << i) | (1 << target), black_bb ^ (1 << victim), -1))
        else:
            for i in range(self.W * self.H):
                if (black_bb >> i) & 1:
                    r, c = divmod(i, self.W)
                    # 1. Forward 1
                    nr = r - 1
                    if nr >= 0:
                        target = nr * self.W + c
                        if not ((white_bb | black_bb) >> target) & 1:
                            moves.append((white_bb, black_bb ^ (1 << i) | (1 << target), -1))
                            # 2. Forward 2 (from second-to-last rank)
                            if r == self.H - 2:
                                target2 = (r - 2) * self.W + c
                                if not ((white_bb | black_bb) >> target2) & 1:
                                    moves.append((white_bb, black_bb ^ (1 << i) | (1 << target2), target))

                    # 3. Diagonal Captures
                    for dc in [-1, 1]:
                        nc = c + dc
                        if 0 <= nc < self.W:
                            target = (r - 1) * self.W + nc
                            # Standard Capture
                            if (white_bb >> target) & 1:
                                moves.append((white_bb ^ (1 << target), black_bb ^ (1 << i) | (1 << target), -1))
                            # En Passant
                            elif target == ep_square:
                                victim = (r) * self.W + nc
                                moves.append((white_bb ^ (1 << victim), black_bb ^ (1 << i) | (1 << target), -1))
        return moves

    def is_immediate_win(self, white_bb, black_bb, last_turn):
        if last_turn == 'W':
            # Reach back rank
            if white_bb & (((1 << self.W) - 1) << (self.W * (self.H - 1))): return True
            # Capture all
            if black_bb == 0: return True
        else:
            # Reach back rank
            if black_bb & ((1 << self.W) - 1): return True
            # Capture all
            if white_bb == 0: return True
        return False

    def solve(self, white_bb, black_bb, turn, ep_square):
        state = (white_bb, black_bb, turn, ep_square)
        if state in self.table:
            return self.table[state]

        # 1. Check if previous move was an immediate win
        prev_turn = 'B' if turn == 'W' else 'W'
        if self.is_immediate_win(white_bb, black_bb, prev_turn):
            return self.LOSS

        # 2. Generate moves
        moves = self.get_moves(white_bb, black_bb, turn, ep_square)
        
        # 3. Handle No Moves Left (Pawn Count Tie-breaker)
        if not moves:
            w_count = self.count_pawns(white_bb)
            b_count = self.count_pawns(black_bb)
            if turn == 'W':
                if w_count > b_count: return self.WIN
                if w_count < b_count: return self.LOSS
                return self.DRAW
            else:
                if b_count > w_count: return self.WIN
                if b_count < w_count: return self.LOSS
                return self.DRAW

        # 4. Negamax recursion
        next_turn = 'B' if turn == 'W' else 'W'
        results = []
        for nw, nb, nep in moves:
            res = self.solve(nw, nb, next_turn, nep)
            results.append(-res)

        best_res = max(results)
        self.table[state] = best_res
        return best_res

    def play(self):
        w, b, t, ep = self.get_start_state()
        print(f"Building Tablebase for {self.W}x{self.H} Pawn Game (Full Rules)...")
        start_time = time.time()
        self.solve(w, b, t, ep)
        print(f"Solved in {time.time() - start_time:.2f}s. Positions explored: {len(self.table)}")

        while True:
            self.print_board(w, b)
            res = self.table.get((w, b, t, ep))
            eval_str = "FORCED WIN" if res == 1 else "FORCED LOSS" if res == -1 else "DRAW"
            print(f"Position Evaluation: {eval_str}")
            
            last_t = 'B' if t == 'W' else 'W'
            if self.is_immediate_win(w, b, last_t):
                print(f"*** {last_t} WINS! ***")
                break

            moves = self.get_moves(w, b, t, ep)
            if not moves:
                w_cnt, b_cnt = self.count_pawns(w), self.count_pawns(b)
                print(f"No moves left! White: {w_cnt}, Black: {b_cnt}")
                if w_cnt > b_cnt: print("White Wins by pawn count!")
                elif b_cnt > w_cnt: print("Black Wins by pawn count!")
                else: print("Draw!")
                break

            if t == 'W':
                move_idx = -1
                while move_idx < 0 or move_idx >= len(moves):
                    print("\nLegal Moves:")
                    for i, (nw, nb, nep) in enumerate(moves):
                        eval_next = self.table.get((nw, nb, 'B', nep), 0)
                        move_eval = "Win" if eval_next == -1 else "Loss" if eval_next == 1 else "Draw"
                        print(f"[{i}] -> Next Eval: {move_eval}")
                    
                    try:
                        move_idx = int(input(f"Choose move index: "))
                    except:
                        continue
                
                w, b, ep = moves[move_idx]
                t = 'B'
            else:
                print("AI (Tablebase) calculating perfect move...")
                best_move = moves[0]
                # Look for move that makes user lose (eval == -1 for White turn)
                for nw, nb, nep in moves:
                    if self.table.get((nw, nb, 'W', nep)) == -1:
                        best_move = (nw, nb, nep)
                        break
                w, b, ep = best_move
                t = 'W'

if __name__ == "__main__":
    # Recommend 4x4 for testing; 8x8 tablebase with EP is too large for local RAM.
    engine = PawnTablebaseEngine(width=5, height=8)
    engine.play()
