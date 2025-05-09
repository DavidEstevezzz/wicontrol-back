<?php

namespace App\Http\Controllers;

use App\Models\PesoRoss;
use Illuminate\Http\Request;

class PesoRossController extends Controller
{
    public function index()
    {
        return response()->json(PesoRoss::all());
    }

    public function show($id)
    {
        return response()->json(PesoRoss::findOrFail($id));
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'edad'    => 'required|integer',
            'Mixto'   => 'required|integer',
            'Machos'  => 'required|integer',
            'Hembras' => 'required|integer',
        ]);

        $item = PesoRoss::create($validated);
        return response()->json($item, 201);
    }

    public function update(Request $request, $id)
    {
        $item = PesoRoss::findOrFail($id);

        $validated = $request->validate([
            'edad'    => 'required|integer',
            'Mixto'   => 'required|integer',
            'Machos'  => 'required|integer',
            'Hembras' => 'required|integer',
        ]);

        $item->update($validated);
        return response()->json($item);
    }

    public function destroy($id)
    {
        PesoRoss::destroy($id);
        return response()->json(null, 204);
    }
}
