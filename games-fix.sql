-- Run this once in Supabase SQL Editor if Tic-Tac-Toe moves are rejected.
-- This replaces play_ttt_move with 0-based cell indexes (0-8).

create or replace function public.play_ttt_move(p_game_id bigint, p_cell integer)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  game_row public.ttt_games%rowtype;
  player_mark text;
  new_board text;
  next_turn text;
  board_chars text[];
  winner_mark text;
  winning_lines integer[][] := array[
    array[1,2,3], array[4,5,6], array[7,8,9],
    array[1,4,7], array[2,5,8], array[3,6,9],
    array[1,5,9], array[3,5,7]
  ];
  line integer[];
begin
  if auth.uid() is null then
    raise exception 'login required';
  end if;

  if p_cell < 0 or p_cell > 8 then
    raise exception 'invalid cell';
  end if;

  select * into game_row
  from public.ttt_games
  where id = p_game_id
  for update;

  if not found then
    raise exception 'game not found';
  end if;
  if game_row.status <> 'active' then
    raise exception 'game is not active';
  end if;

  if game_row.creator_id = auth.uid() then
    player_mark := 'X';
  elsif game_row.opponent_id = auth.uid() then
    player_mark := 'O';
  else
    raise exception 'not a player';
  end if;

  if game_row.turn <> player_mark then
    raise exception 'not your turn';
  end if;

  if substring(game_row.board from p_cell + 1 for 1) <> '-' then
    raise exception 'cell is occupied';
  end if;

  board_chars := regexp_split_to_array(game_row.board, '');
  board_chars[p_cell + 1] := player_mark;
  new_board := array_to_string(board_chars, '');

  winner_mark := null;
  foreach line in array winning_lines loop
    if substring(new_board from line[1] for 1) <> '-'
      and substring(new_board from line[1] for 1) = substring(new_board from line[2] for 1)
      and substring(new_board from line[1] for 1) = substring(new_board from line[3] for 1) then
      winner_mark := substring(new_board from line[1] for 1);
    end if;
  end loop;

  if winner_mark is not null then
    update public.ttt_games
    set board = new_board,
        status = 'finished',
        winner_id = case when winner_mark = 'X' then creator_id else opponent_id end,
        result = winner_mark,
        updated_at = now()
    where id = p_game_id;
    return winner_mark;
  end if;

  if position('-' in new_board) = 0 then
    update public.ttt_games
    set board = new_board,
        status = 'finished',
        winner_id = null,
        result = 'draw',
        updated_at = now()
    where id = p_game_id;
    return 'draw';
  end if;

  next_turn := case when player_mark = 'X' then 'O' else 'X' end;
  update public.ttt_games
  set board = new_board,
      turn = next_turn,
      updated_at = now()
  where id = p_game_id;

  return next_turn;
end;
$$;

revoke all on function public.play_ttt_move(bigint, integer) from public;
grant execute on function public.play_ttt_move(bigint, integer) to authenticated;
