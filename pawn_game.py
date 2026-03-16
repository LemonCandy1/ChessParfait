import time

class FastPawnEngine:
    def __init__(self, width=8, height=8):
        self.W = width
        self.H = height
        self.total_squares = width * height
        
        # Transposition Table (Memoization)
        self.tt = {}
        
        # Masks for Bitwise logic
        self.FULL_MASK = (1 << self.total_squares) - 1
        self.FILE_A = 0
        for i in range(height):
            self.FILE_A |= (1 << (i * width))
        self.FILE_H = self.FILE_A << (width - 1)
        
        self.NOT_FILE_A = self.FULL_MASK ^ self.FILE_A
        self.NOT_FILE_H = self.FULL_MASK ^ self.FILE_H
        
        self.WIN_RANK_W = ((1 << width) - 1) << (width * (height - 1))
        self.WIN_RANK_B = (1 << width) - 1

    def get_start_state(self):
        white_bb = ((1 << self.W) - 1) << self.W  # Rank 2
        black_bb = ((1 << self.W) - 1) << (self.W * (self.H - 2))  # Rank 7
        return white_bb, black_bb

    def get_moves(self, white_bb, black_bb, turn):
        moves = []
        occ = white_bb | black_bb
        
        if turn == 'W':
            # Single Push
            targets = (white_bb << self.W) & ~occ
            self._add_bitwise_moves(moves, white_bb, targets, self.W, black_bb, False)
            
            # Double Push (only from Rank 2)
            rank2 = ((1 << self.W) - 1) << self.W
            targets_double = ((targets & rank2) << self.W) & ~occ
            self._add_bitwise_moves(moves, white_bb, targets_double, self.W * 2, black_bb, False)
            
            # Captures
            cap_l = (white_bb << (self.W - 1)) & black_bb & self.NOT_FILE_H
            self._add_bitwise_moves(moves, white_bb, cap_l, self.W - 1, black_bb, True)
            cap_r = (white_bb << (self.W + 1)) & black_bb & self.NOT_FILE_A
            self._add_bitwise_moves(moves, white_bb, cap_r, self.W + 1, black_bb, True)
            
        else:
            # Black moves (Shift Right / Down)
            targets = (black_bb >> self.W) & ~occ
            self._add_bitwise_moves(moves, black_bb, targets, -self.W, white_bb, False)
            
            rank7 = ((1 << self.W) - 1) << (self.W * (self.H - 2))
            targets_double = ((targets & rank7) >> self.W) & ~occ
            self._add_bitwise_moves(moves, black_bb, targets_double, -self.W * 2, white_bb, False)
            
            cap_l = (black_bb >> (self.W + 1)) & white_bb & self.NOT_FILE_H
            self._add_bitwise_moves(moves, black_bb, cap_l, -(self.W + 1), white_bb, True)
            cap_r = (black_bb >> (self.W - 1)) & white_bb & self.NOT_FILE_A
            self._add_bitwise_moves(moves, black_bb, cap_r, -(self.W - 1), white_bb, True)
            
        return moves

    def _add_bitwise_moves(self, moves_list, mover_bb, targets, shift, enemy_bb, is_cap):
        while targets:
            target_bit = targets & -targets
            origin_bit = target_bit >> shift if shift > 0 else target_bit << abs(shift)
            
            new_mover = (mover_bb ^ origin_bit) | target_bit
            new_enemy = (enemy_bb ^ target_bit) if is_cap else enemy_bb
            
            # Append as (white_bb, black_bb)
            if shift > 0: # White was moving
                moves_list.append((new_mover, new_enemy))
            else: # Black was moving
                moves_list.append((new_enemy, new_mover))
            targets ^= target_bit

    def evaluate(self, w_bb, b_bb):
        # Material + Progress
        w_count = bin(w_bb).count('1')
        b_count = bin(b_bb).count('1')
        return w_count - b_count

    def minimax(self, w_bb, b_bb, depth, alpha, beta, turn):
        state = (w_bb, b_bb, turn)
        if state in self.tt and self.tt[state][1] >= depth:
            return self.tt[state][0]

        # Win Checks
        if b_bb == 0 or (w_bb & self.WIN_RANK_W): return 1000 + depth
        if w_bb == 0 or (b_bb & self.WIN_RANK_B): return -1000 - depth

        if depth == 0:
            return self.evaluate(w_bb, b_bb)

        moves = self.get_moves(w_bb, b_bb, turn)
        if not moves: return 0 # Draw/Stalemate

        if turn == 'W':
            max_eval = -float('inf')
            for nw, nb in moves:
                ev = self.minimax(nw, nb, depth - 1, alpha, beta, 'B')
                max_eval = max(max_eval, ev)
                alpha = max(alpha, ev)
                if beta <= alpha: break
            self.tt[state] = (max_eval, depth)
            return max_eval
        else:
            min_eval = float('inf')
            for nw, nb in moves:
                ev = self.minimax(nw, nb, depth - 1, alpha, beta, 'W')
                min_eval = min(min_eval, ev)
                beta = min(beta, ev)
                if beta <= alpha: break
            self.tt[state] = (min_eval, depth)
            return min_eval

    def print_board(self, w_bb, b_bb):
        for r in range(self.H - 1, -1, -1):
            row = f"{r+1} "
            for c in range(self.W):
                idx = r * self.W + c
                if (w_bb >> idx) & 1: row += "W "
                elif (b_bb >> idx) & 1: row += "B "
                else: row += ". "
            print(row)
        print("  a b c d e f g h")

    def play(self):
        w, b = self.get_start_state()
        turn = 'W'
        while True:
            self.print_board(w, b)
            if turn == 'W':
                moves = self.get_moves(w, b, 'W')
                print(f"Legal moves: {len(moves)}")
                idx = int(input("Choose move index: "))
                w, b = moves[idx]
                turn = 'B'
            else:
                print("AI thinking...")
                start = time.time()
                best_val = float('inf')
                best_move = None
                for nw, nb in self.get_moves(w, b, 'B'):
                    # Search depth 6 for immediate response
                    val = self.minimax(nw, nb, 6, -float('inf'), float('inf'), 'W')
                    if val < best_val:
                        best_val = val
                        best_move = (nw, nb)
                w, b = best_move
                print(f"AI moved in {time.time()-start:.2f}s")
                turn = 'W'

if __name__ == "__main__":
    engine = FastPawnEngine(8, 8)
    engine.play()